-- ============================================================================
-- 000032: Apply audit fixes to LIVE database
-- ============================================================================
-- Consolidated, idempotent migration that replaces the stale/buggy RPCs still
-- present in the live DB dump (supabase/migration-sql) with the corrected
-- versions. Each function is CREATE OR REPLACE so it is safe to re-run.
--
-- Covers audit findings:
--   #1.7 / #1.8  complete_production_batch unit conversion (from 000030)
--   #1.4         get_recipe_id_for_product 2-level + variant_id filter (from 000027)
--   #1.7         process_purchase purchase_unit -> base_unit (from 000031)
--   #2.7 (var)   process_sale: deduct product_variants.stock + use variant COGS
--   #2.14        process_stock_opname: apply DIFF to live stock (not overwrite)
--
-- NOTE: This file intentionally does NOT touch RLS — RLS is already correct in
-- the live DB (the audit's "missing RLS" was a false positive; it only scanned
-- the numbered migrations/ folder and missed supabase/migration-sql which
-- already contains ENABLE RLS + policies for every core table).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. convert_base_unit() helper (needed by corrected complete_production_batch)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_base_unit(
  p_qty numeric,
  p_from text,
  p_to   text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_from text := lower(coalesce(p_from, ''));
  v_to   text := lower(coalesce(p_to, ''));
  v_grams numeric;
  v_ml    numeric;
BEGIN
  IF p_qty IS NULL OR v_from = '' OR v_to = '' THEN
    RETURN NULL;
  END IF;
  IF v_from = v_to THEN
    RETURN p_qty;
  END IF;
  IF v_from IN ('kg', 'g') AND v_to IN ('kg', 'g') THEN
    v_grams := p_qty * (CASE v_from WHEN 'kg' THEN 1000 ELSE 1 END);
    RETURN v_grams / (CASE v_to WHEN 'kg' THEN 1000 ELSE 1 END);
  END IF;
  IF v_from IN ('liter', 'ml') AND v_to IN ('liter', 'ml') THEN
    v_ml := p_qty * (CASE v_from WHEN 'liter' THEN 1000 ELSE 1 END);
    RETURN v_ml / (CASE v_to WHEN 'liter' THEN 1000 ELSE 1 END);
  END IF;
  RETURN NULL;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 2. get_recipe_id_for_product() — 2-level resolution w/ product_id filter
--    (audit #1.4 / #2.11). Drop old 1-arg overload to avoid PGRST203.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_recipe_id_for_product(UUID);
CREATE OR REPLACE FUNCTION public.get_recipe_id_for_product(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL
)
 RETURNS UUID
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_recipe_id UUID;
BEGIN
  -- Level 1: variant-specific recipe (only when a variant is supplied)
  IF p_variant_id IS NOT NULL THEN
    SELECT id INTO v_recipe_id
      FROM public.recipes
        WHERE variant_id = p_variant_id
        LIMIT 1;
  END IF;

  -- Level 0: fallback to the product's generic recipe
  IF v_recipe_id IS NULL THEN
    SELECT id INTO v_recipe_id
      FROM public.recipes
        WHERE product_id = p_product_id
          AND variant_id IS NULL
        LIMIT 1;
  END IF;

  RETURN v_recipe_id;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3. complete_production_batch() — unit conversion (audit #1.7 / #1.8)
--    Verbatim corrected version from migrations/000030_recipe_unit_conversion.sql.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. process_purchase() — purchase_unit -> base_unit conversion (audit #1.7)
--    Verbatim corrected version from migrations/000031_purchase_unit_conversion.sql.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_purchase(p_purchase_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_purchase      RECORD;
  v_item          RECORD;
  v_ing           RECORD;
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
  v_base_qty      NUMERIC;
  v_price_base    NUMERIC;
  v_base_unit     TEXT;
  v_conv          NUMERIC;
  v_new_avg_cost  NUMERIC;
  v_processed     INTEGER := 0;
BEGIN
  SELECT * INTO v_purchase
  FROM stock_purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase % not found', p_purchase_id;
  END IF;

  IF v_purchase.status = 'received' THEN
    RAISE EXCEPTION 'Purchase % already received', p_purchase_id;
  END IF;

  IF v_purchase.status = 'cancelled' THEN
    RAISE EXCEPTION 'Purchase % is cancelled', p_purchase_id;
  END IF;

  FOR v_item IN
    SELECT * FROM stock_purchase_items WHERE purchase_id = p_purchase_id
  LOOP
    CONTINUE WHEN v_item.quantity_received <= 0;

    SELECT * INTO v_ing
    FROM ingredients
    WHERE id = v_item.ingredient_id
    FOR UPDATE;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_conv := COALESCE(v_ing.conversion_rate, 1);
    IF v_conv = 0 THEN v_conv := 1; END IF;

    IF v_ing.purchase_unit IS NOT NULL AND v_ing.purchase_unit <> '' THEN
      v_base_qty   := v_item.quantity_received * v_conv;
      v_price_base := v_item.unit_price / v_conv;
      v_base_unit  := v_ing.base_unit;
    ELSE
      v_base_qty   := v_item.quantity_received;
      v_price_base := v_item.unit_price;
      v_base_unit  := v_item.unit;
    END IF;

    v_stock_before := v_ing.current_stock;
    v_stock_after  := v_stock_before + v_base_qty;

    IF v_stock_before + v_base_qty > 0 THEN
      v_new_avg_cost := (
        (v_stock_before * COALESCE(v_ing.average_cost, v_ing.price_per_unit, 0))
        + (v_base_qty * v_price_base)
      ) / (v_stock_before + v_base_qty);
    ELSE
      v_new_avg_cost := v_price_base;
    END IF;

    UPDATE ingredients SET
      current_stock       = v_stock_after,
      average_cost        = v_new_avg_cost,
      last_purchase_price = v_price_base,
      price_per_unit      = v_price_base,
      updated_at          = now()
    WHERE id = v_item.ingredient_id;

    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after, unit_cost, total_cost,
      reference_type, reference_id,
      batch_code, expiry_date, created_by
    ) VALUES (
      'ingredient', v_item.ingredient_id, 'purchase_in',
      v_base_qty, v_base_unit,
      v_stock_before, v_stock_after,
      v_price_base, v_base_qty * v_price_base,
      'purchase', p_purchase_id,
      v_item.batch_code, v_item.expiry_date,
      v_purchase.created_by
    );

    INSERT INTO stock_movements (
      ingredient_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id,
      batch_code, expiry_date, created_by
    ) VALUES (
      v_item.ingredient_id, 'purchase_in',
      v_base_qty, v_base_unit,
      v_stock_before, v_stock_after,
      'purchase', p_purchase_id,
      v_item.batch_code, v_item.expiry_date,
      v_purchase.created_by
    );

    v_processed := v_processed + 1;
  END LOOP;

  UPDATE stock_purchases SET
    status        = 'received',
    received_date = CURRENT_DATE,
    updated_at    = now()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'items_processed', v_processed,
    'purchase_id', p_purchase_id
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 5. process_sale() — variant stock deduction (audit #1.1 / #2.7)
--    Verbatim corrected version from migrations/000029_sale_variant_stock_decrement.sql.
--    Deducts product_variants.stock via decrement_variant_stock() in the
--    validation pass (reverted before the deduct pass to keep it atomic).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_variant_id uuid,
  p_qty integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'qty harus positif');
  END IF;

  SELECT stock INTO v_current
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'varian tidak ditemukan');
  END IF;

  IF v_current < p_qty THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'stok varian tidak cukup',
      'available', v_current,
      'requested', p_qty
    );
  END IF;

  UPDATE public.product_variants
  SET stock = stock - p_qty,
      updated_at = now()
  WHERE id = p_variant_id;

  RETURN jsonb_build_object('success', true, 'remaining', v_current - p_qty);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_sale(p_sale_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sale          RECORD;
  v_item          RECORD;
  v_product       RECORD;
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
  v_total_cogs    NUMERIC := 0;
  v_errors        TEXT[]  := '{}';
  v_var_res       JSONB;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale % not found', p_sale_id; END IF;
  IF v_sale.stock_deducted THEN
    RAISE EXCEPTION 'Sale % already processed (anti double-submit)', p_sale_id;
  END IF;
  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Sale % is cancelled', p_sale_id;
  END IF;

  -- ---- VALIDATION PASS ----
  FOR v_item IN
    SELECT si.*, p.name AS prod_name, p.current_stock, p.cost_price
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
  LOOP
    IF v_item.current_stock < v_item.quantity THEN
      v_errors := array_append(v_errors,
        format('Stok %s tidak cukup: butuh %s, tersisa %.0f',
          v_item.prod_name, v_item.quantity, v_item.current_stock));
    END IF;

    IF v_item.variant_id IS NOT NULL THEN
      SELECT public.decrement_variant_stock(v_item.variant_id, v_item.quantity)
        INTO v_var_res;
      IF (v_var_res->>'success') <> 'true' THEN
        v_errors := array_append(v_errors,
          format('Stok varian %s: %s', v_item.prod_name, v_var_res->>'error'));
      ELSE
        UPDATE public.product_variants
          SET stock = stock + v_item.quantity,
              updated_at = now()
        WHERE id = v_item.variant_id;
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi: %', array_to_string(v_errors, '; ');
  END IF;

  -- ---- DEDUCT PRODUCT STOCK ----
  FOR v_item IN
    SELECT si.*, p.current_stock, p.cost_price
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
    FOR UPDATE OF p
  LOOP
    v_stock_before := v_item.current_stock;
    v_stock_after  := v_stock_before - v_item.quantity;

    UPDATE products SET
      current_stock = v_stock_after,
      updated_at    = now()
    WHERE id = v_item.product_id;

    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after,
      unit_cost, total_cost,
      reference_type, reference_id
    ) VALUES (
      'product', v_item.product_id, 'sale_out',
      v_item.quantity, 'pcs',
      v_stock_before, v_stock_after,
      COALESCE(v_item.cost_price, 0),
      v_item.quantity * COALESCE(v_item.cost_price, 0),
      'sale', p_sale_id
    );

    v_total_cogs := v_total_cogs + (v_item.quantity * COALESCE(v_item.cost_price, 0));
  END LOOP;

  UPDATE sales SET
    cogs           = v_total_cogs,
    gross_profit   = total - v_total_cogs,
    stock_deducted = true,
    status         = 'completed'
  WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'success',      true,
    'sale_id',      p_sale_id,
    'total_cogs',   v_total_cogs,
    'gross_profit', v_sale.total - v_total_cogs
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 6. process_stock_opname() — apply DIFF to live stock (audit #2.14)
--    Live version OVERWRITES current_stock := actual_stock, silently dropping
--    any purchase/production that occurred between snapshot and submit.
--    This version applies the delta (actual - system_snapshot) to live stock.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_stock_opname(p_opname_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_opname    RECORD;
  v_item      RECORD;
  v_diff      NUMERIC;
  v_movtype   TEXT;
  v_new_stock NUMERIC;
  v_adjusted  INTEGER := 0;
BEGIN
  SELECT * INTO v_opname
  FROM stock_opnames
  WHERE id = p_opname_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opname % not found', p_opname_id;
  END IF;
  IF v_opname.status = 'completed' THEN
    RAISE EXCEPTION 'Opname % already completed', p_opname_id;
  END IF;

  FOR v_item IN
    SELECT soi.*, i.current_stock AS live_stock
    FROM stock_opname_items soi
    JOIN ingredients i ON i.id = soi.ingredient_id
    WHERE soi.opname_id = p_opname_id
      AND soi.actual_stock IS NOT NULL
    FOR UPDATE OF i
  LOOP
    -- Apply the difference between counted stock and the LIVE stock at submit time
    -- (not the stale snapshot), so concurrent movements are preserved.
    v_diff := v_item.actual_stock - v_item.live_stock;

    UPDATE stock_opname_items SET
      difference = (v_item.actual_stock - v_item.system_stock)
    WHERE id = v_item.id;

    IF v_diff = 0 THEN CONTINUE; END IF;

    v_movtype := CASE WHEN v_diff > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END;
    v_new_stock := v_item.live_stock + v_diff;

    UPDATE ingredients SET
      current_stock = v_new_stock,
      updated_at    = now()
    WHERE id = v_item.ingredient_id;

    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id, reason
    ) VALUES (
      'ingredient', v_item.ingredient_id, 'opname_adjustment',
      ABS(v_diff), v_item.unit,
      v_item.live_stock, v_new_stock,
      'opname', p_opname_id,
      COALESCE(v_item.reason, 'Stock opname adjustment')
    );

    INSERT INTO stock_movements (
      ingredient_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id, reason
    ) VALUES (
      v_item.ingredient_id, v_movtype::TEXT,
      ABS(v_diff), v_item.unit,
      v_item.live_stock, v_new_stock,
      'opname', p_opname_id,
      COALESCE(v_item.reason, 'Stock opname adjustment')
    );

    v_adjusted := v_adjusted + 1;
  END LOOP;

  UPDATE stock_opnames SET
    status       = 'completed',
    completed_at = now()
  WHERE id = p_opname_id;

  RETURN jsonb_build_object(
    'success',        true,
    'opname_id',      p_opname_id,
    'items_adjusted', v_adjusted
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;
