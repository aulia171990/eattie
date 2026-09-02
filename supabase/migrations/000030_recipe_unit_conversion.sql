-- ============================================================
-- 000030: Konversi satuan resep -> base unit di produksi
-- ============================================================
-- Masalah: complete_production_batch() memotong stok dengan
--   v_needed := v_ri.quantity * v_scale_factor
-- tanpa mengonversi unit resep ke base_unit bahan. Jika resep
-- mencantumkan "g" tapi base_unit bahan "kg", pemotongan stok
-- dan perhitungan HPP menjadi salah besar (1000x lipat).
--
-- Perbaikan:
--   1. Fungsi convert_base_unit(qty, from, to) — konversi massa
--      (kg<->g) dan volume (liter<->ml). NULL bila tidak
--      se-dimensional (mis. kg <-> pcs) agar caller bisa error.
--   2. complete_production_batch() mengonversi setiap baris resep
--      ke base_unit bahan sebelum memotong stok & menghitung biaya.
--      Bila unit tidak cocok (beda dimensi) -> error jelas, bukan
--      potong salah.
--
-- Idempoten / aman dijalankan ulang.

-- 1. Helper konversi antar satuan dasar
CREATE OR REPLACE FUNCTION public.convert_base_unit(
  p_qty       numeric,
  p_from      text,
  p_to        text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_from text := lower(coalesce(p_from, ''));
  v_to   text := lower(coalesce(p_to, ''));
  v_dim  text;
  v_grams numeric;
  v_ml    numeric;
BEGIN
  IF p_qty IS NULL OR v_from = '' OR v_to = '' THEN
    RETURN NULL;
  END IF;
  IF v_from = v_to THEN
    RETURN p_qty;
  END IF;

  -- massa
  IF v_from IN ('kg', 'g') AND v_to IN ('kg', 'g') THEN
    v_grams := p_qty * (CASE v_from WHEN 'kg' THEN 1000 ELSE 1 END);
    RETURN v_grams / (CASE v_to WHEN 'kg' THEN 1000 ELSE 1 END);
  END IF;

  -- volume
  IF v_from IN ('liter', 'ml') AND v_to IN ('liter', 'ml') THEN
    v_ml := p_qty * (CASE v_from WHEN 'liter' THEN 1000 ELSE 1 END);
    RETURN v_ml / (CASE v_to WHEN 'liter' THEN 1000 ELSE 1 END);
  END IF;

  -- unit diskrit (pcs/sachet/lembar/botol): beda unit = tidak bisa dikonversi
  RETURN NULL;
END;
$function$;

-- 2. Rewrite complete_production_batch dengan konversi unit
CREATE OR REPLACE FUNCTION public.complete_production_batch(
  p_batch_id uuid,
  p_quantity_produced numeric,
  p_quantity_defect numeric DEFAULT 0
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_batch         RECORD;
  v_recipe        RECORD;
  v_ri            RECORD;
  v_ing           RECORD;
  v_needed        NUMERIC;
  v_base_qty      NUMERIC;
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
  v_scale_factor  NUMERIC;
  v_total_cost    NUMERIC := 0;
  v_cost_per_unit NUMERIC := 0;
  v_unit_cost     NUMERIC;
  v_prod_before   NUMERIC;
  v_prod_after    NUMERIC;
  v_var_before    NUMERIC;
  v_var_after     NUMERIC;
  v_errors        TEXT[]  := '{}';
BEGIN
  IF p_quantity_produced < 0 THEN
    RAISE EXCEPTION 'quantity_produced cannot be negative';
  END IF;
  IF p_quantity_defect < 0 THEN
    RAISE EXCEPTION 'quantity_defect cannot be negative';
  END IF;

  SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Production batch % not found', p_batch_id; END IF;
  IF v_batch.status = 'completed' THEN RAISE EXCEPTION 'Batch % already completed', p_batch_id; END IF;
  IF v_batch.stock_consumed THEN RAISE EXCEPTION 'Batch % stock already consumed', p_batch_id; END IF;

  SELECT * INTO v_recipe FROM recipes WHERE id = v_batch.recipe_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No recipe found for batch %', p_batch_id; END IF;

  v_scale_factor := p_quantity_produced::NUMERIC / NULLIF(v_recipe.yield_quantity, 0);

  -- ---- VALIDATION PASS ----
  FOR v_ri IN
    SELECT ri.*, i.name AS ing_name, i.current_stock, i.base_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = v_recipe.id
  LOOP
    -- Konversi unit resep -> base_unit bahan
    v_base_qty := convert_base_unit(v_ri.quantity, v_ri.unit, v_ri.base_unit);
    IF v_base_qty IS NULL THEN
      v_errors := array_append(v_errors,
        format('Satuan resep %s (%s) tidak cocok dengan satuan dasar bahan %s (%s)',
          v_ri.ing_name, v_ri.unit, v_ri.ing_name, v_ri.base_unit));
      CONTINUE;
    END IF;

    v_needed := v_base_qty * v_scale_factor;
    IF v_ri.current_stock < v_needed THEN
      v_errors := array_append(v_errors,
        format('Stok %s tidak cukup: butuh %.3f %s, tersisa %.3f %s',
          v_ri.ing_name, v_needed, v_ri.base_unit, v_ri.current_stock, v_ri.base_unit));
    END IF;
  END LOOP;
  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi / satuan tidak valid: %', array_to_string(v_errors, '; ');
  END IF;

  -- ---- CONSUME PASS ----
  FOR v_ri IN
    SELECT ri.*, i.current_stock, i.base_unit, i.average_cost, i.price_per_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = v_recipe.id
    FOR UPDATE OF i
  LOOP
    v_base_qty     := convert_base_unit(v_ri.quantity, v_ri.unit, v_ri.base_unit);
    v_needed       := v_base_qty * v_scale_factor;
    v_stock_before := v_ri.current_stock;
    v_stock_after  := v_stock_before - v_needed;
    v_unit_cost    := COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0);

    UPDATE ingredients SET
      current_stock = v_stock_after,
      updated_at    = now()
    WHERE id = v_ri.ingredient_id;

    -- Unified movements (quantity & unit in ingredient base_unit)
    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after,
      unit_cost, total_cost,
      reference_type, reference_id
    ) VALUES (
      'ingredient', v_ri.ingredient_id, 'production_out',
      v_needed, v_ri.base_unit,
      v_stock_before, v_stock_after,
      v_unit_cost, v_needed * v_unit_cost,
      'production', p_batch_id
    );

    -- Legacy stock_movements
    INSERT INTO stock_movements (
      ingredient_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id
    ) VALUES (
      v_ri.ingredient_id, 'production_out',
      v_needed, v_ri.base_unit,
      v_stock_before, v_stock_after,
      'production', p_batch_id
    );

    v_total_cost := v_total_cost + (v_needed * v_unit_cost);
  END LOOP;

  -- ---- ADD FINISHED GOODS ----
  v_cost_per_unit := CASE WHEN p_quantity_produced > 0
    THEN v_total_cost / p_quantity_produced
    ELSE 0 END;

  SELECT current_stock INTO v_prod_before FROM products WHERE id = v_batch.product_id FOR UPDATE;
  v_prod_after := COALESCE(v_prod_before, 0) + p_quantity_produced;
  UPDATE products SET
    current_stock = v_prod_after,
    cost_price    = v_cost_per_unit,
    updated_at    = now()
  WHERE id = v_batch.product_id;

  INSERT INTO inventory_movements (
    item_type, item_id, movement_type, quantity, unit,
    stock_before, stock_after,
    unit_cost, total_cost,
    reference_type, reference_id
  ) VALUES (
    'product', v_batch.product_id, 'production_in',
    p_quantity_produced, 'pcs',
    COALESCE(v_prod_before, 0), v_prod_after,
    v_cost_per_unit, v_total_cost,
    'production', p_batch_id
  );

  IF v_batch.variant_id IS NOT NULL THEN
    SELECT stock INTO v_var_before FROM product_variants WHERE id = v_batch.variant_id FOR UPDATE;
    v_var_after := COALESCE(v_var_before, 0) + p_quantity_produced;
    UPDATE product_variants SET stock = v_var_after, updated_at = now() WHERE id = v_batch.variant_id;
    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after,
      unit_cost, total_cost,
      reference_type, reference_id
    ) VALUES (
      'product_variant', v_batch.variant_id, 'production_in',
      p_quantity_produced, 'pcs',
      COALESCE(v_var_before, 0), v_var_after,
      v_cost_per_unit, v_total_cost,
      'production', p_batch_id
    );
  END IF;

  UPDATE production_batches SET
    status = 'completed', quantity_produced = p_quantity_produced, quantity_defect = p_quantity_defect,
    cost_per_unit = v_cost_per_unit, total_cost = v_total_cost, stock_consumed = true,
    completed_at = now(), updated_at = now()
  WHERE id = p_batch_id;

  INSERT INTO product_inventory (product_id, variant_id, batch_id, quantity)
    VALUES (v_batch.product_id, v_batch.variant_id, p_batch_id, p_quantity_produced);

  RETURN jsonb_build_object(
    'success', true, 'batch_id', p_batch_id,
    'quantity_produced', p_quantity_produced, 'quantity_defect', p_quantity_defect,
    'total_cost', v_total_cost, 'cost_per_unit', v_cost_per_unit
  );
END;
$function$;
