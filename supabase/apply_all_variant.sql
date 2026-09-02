-- ============================================================
-- APPLY ALL: Recipe↔Variant + Production→Variant + Sale→Variant
-- ============================================================
-- SATU FILE SIAP-COPAS ke Supabase SQL Editor (jalankan sekali).
-- Urutan aman & idempoten:
--   PART A (000027): resolver resep 2-level (resep per-varian dulu,
--                    fallback generik) + unique index anti-duplikat.
--   PART B (000028): production_batches + product_inventory dapat
--                    variant_id; complete_production_batch() menambah
--                    stok ke product_variants.stock saat batch punya varian.
--   PART C (000029): decrement_variant_stock() helper + process_sale()
--                    mengurangi product_variants.stock saat jualan.
--
-- CATATAN: complete_production_batch() & process_sale() HANYA ada di
-- live Supabase. Definisi di bawah rekonstruksi dari repo. SEBELUM
-- apply, diff ke definisi live (Functions di Supabase) bila ada
-- custom logic tambahan. Signature tiap fungsi tetap sama → tidak
-- memicu overload PGRST203.
-- ============================================================


-- ============================================================
-- PART A — 000027: Recipe 2-level resolution
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recipes'
      AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.recipes
      ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS recipes_variant_id_idx ON public.recipes (variant_id);

CREATE UNIQUE INDEX IF NOT EXISTS recipes_product_generic_uniq
  ON public.recipes (product_id)
  WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recipes_product_variant_uniq
  ON public.recipes (product_id, variant_id)
  WHERE variant_id IS NOT NULL;

-- Hilangkan overload lama (1-arg) agar PostgREST tidak bingung (PGRST203)
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
  IF p_variant_id IS NOT NULL THEN
    SELECT id INTO v_recipe_id
      FROM public.recipes
        WHERE variant_id = p_variant_id
        LIMIT 1;
  END IF;
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


-- ============================================================
-- PART B — 000028: Production → Variant stock
-- ============================================================
ALTER TABLE public.production_batches
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

ALTER TABLE public.product_inventory
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_production_batches_variant
  ON public.production_batches (variant_id);

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
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
  v_scale_factor  NUMERIC;
  v_total_cost    NUMERIC := 0;
  v_cost_per_unit NUMERIC := 0;
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

  FOR v_ri IN
    SELECT ri.*, i.name AS ing_name, i.current_stock, i.base_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = v_recipe.id
  LOOP
    v_needed := v_ri.quantity * v_scale_factor;
    IF v_ri.current_stock < v_needed THEN
      v_errors := array_append(v_errors,
        format('Stok %s tidak cukup: butuh %.3f %s, tersisa %.3f %s',
          v_ri.ing_name, v_needed, v_ri.unit, v_ri.current_stock, v_ri.base_unit));
    END IF;
  END LOOP;
  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi: %', array_to_string(v_errors, '; ');
  END IF;

  FOR v_ri IN
    SELECT ri.*, i.current_stock, i.average_cost, i.price_per_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = v_recipe.id
    FOR UPDATE OF i
  LOOP
    v_needed       := v_ri.quantity * v_scale_factor;
    v_stock_before := v_ri.current_stock;
    v_stock_after  := v_stock_before - v_needed;
    UPDATE ingredients SET current_stock = v_stock_after, updated_at = now() WHERE id = v_ri.ingredient_id;
    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
      VALUES ('ingredient', v_ri.ingredient_id, 'production_out', v_needed, v_ri.unit, v_stock_before, v_stock_after,
              COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0), v_needed * COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0), 'production', p_batch_id);
    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id)
      VALUES (v_ri.ingredient_id, 'production_out', v_needed, v_ri.unit, v_stock_before, v_stock_after, 'production', p_batch_id);
    v_total_cost := v_total_cost + (v_needed * COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0));
  END LOOP;

  v_cost_per_unit := CASE WHEN p_quantity_produced > 0 THEN v_total_cost / p_quantity_produced ELSE 0 END;

  SELECT current_stock INTO v_prod_before FROM products WHERE id = v_batch.product_id FOR UPDATE;
  v_prod_after := COALESCE(v_prod_before, 0) + p_quantity_produced;
  UPDATE products SET current_stock = v_prod_after, cost_price = v_cost_per_unit, updated_at = now() WHERE id = v_batch.product_id;
  INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
    VALUES ('product', v_batch.product_id, 'production_in', p_quantity_produced, 'pcs', COALESCE(v_prod_before, 0), v_prod_after, v_cost_per_unit, v_total_cost, 'production', p_batch_id);

  IF v_batch.variant_id IS NOT NULL THEN
    SELECT stock INTO v_var_before FROM product_variants WHERE id = v_batch.variant_id FOR UPDATE;
    v_var_after := COALESCE(v_var_before, 0) + p_quantity_produced;
    UPDATE product_variants SET stock = v_var_after, updated_at = now() WHERE id = v_batch.variant_id;
    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
      VALUES ('product_variant', v_batch.variant_id, 'production_in', p_quantity_produced, 'pcs', COALESCE(v_var_before, 0), v_var_after, v_cost_per_unit, v_total_cost, 'production', p_batch_id);
  END IF;

  UPDATE production_batches SET
    status = 'completed', quantity_produced = p_quantity_produced, quantity_defect = p_quantity_defect,
    cost_per_unit = v_cost_per_unit, total_cost = v_total_cost, stock_consumed = true,
    completed_at = now(), updated_at = now()
  WHERE id = p_batch_id;

  INSERT INTO product_inventory (product_id, variant_id, batch_id, quantity)
    VALUES (v_batch.product_id, v_batch.variant_id, p_batch_id, p_quantity_produced);

  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id, 'quantity_produced', p_quantity_produced,
                            'quantity_defect', p_quantity_defect, 'total_cost', v_total_cost, 'cost_per_unit', v_cost_per_unit);
END;
$function$;


-- ============================================================
-- PART C — 000029: Sale → Variant stock
-- ============================================================
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
  SELECT stock INTO v_current FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'varian tidak ditemukan');
  END IF;
  IF v_current < p_qty THEN
    RETURN jsonb_build_object('success', false, 'error', 'stok varian tidak cukup', 'available', v_current, 'requested', p_qty);
  END IF;
  UPDATE public.product_variants SET stock = stock - p_qty, updated_at = now() WHERE id = p_variant_id;
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
  IF v_sale.stock_deducted THEN RAISE EXCEPTION 'Sale % already processed (anti double-submit)', p_sale_id; END IF;
  IF v_sale.status = 'cancelled' THEN RAISE EXCEPTION 'Sale % is cancelled', p_sale_id; END IF;

  -- VALIDATION PASS
  FOR v_item IN
    SELECT si.*, p.name AS prod_name, p.current_stock, p.cost_price
    FROM sale_items si JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
  LOOP
    IF v_item.current_stock < v_item.quantity THEN
      v_errors := array_append(v_errors,
        format('Stok %s tidak cukup: butuh %s, tersisa %.0f', v_item.prod_name, v_item.quantity, v_item.current_stock));
    END IF;
    IF v_item.variant_id IS NOT NULL THEN
      SELECT public.decrement_variant_stock(v_item.variant_id, v_item.quantity) INTO v_var_res;
      IF (v_var_res->>'success') <> 'true' THEN
        v_errors := array_append(v_errors, format('Stok varian %s: %s', v_item.prod_name, v_var_res->>'error'));
      ELSE
        -- revert temporary decrement; DEDUCT pass is the single source of truth
        UPDATE public.product_variants SET stock = stock + v_item.quantity, updated_at = now() WHERE id = v_item.variant_id;
      END IF;
    END IF;
  END LOOP;
  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi: %', array_to_string(v_errors, '; ');
  END IF;

  -- DEDUCT PRODUCT STOCK (+ variant stock for real)
  FOR v_item IN
    SELECT si.*, p.current_stock, p.cost_price
    FROM sale_items si JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
    FOR UPDATE OF p
  LOOP
    v_stock_before := v_item.current_stock;
    v_stock_after  := v_stock_before - v_item.quantity;
    UPDATE products SET current_stock = v_stock_after, updated_at = now() WHERE id = v_item.product_id;
    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
      VALUES ('product', v_item.product_id, 'sale_out', v_item.quantity, 'pcs', v_stock_before, v_stock_after,
              COALESCE(v_item.cost_price, 0), v_item.quantity * COALESCE(v_item.cost_price, 0), 'sale', p_sale_id);
    -- Variant stock (single source of truth)
    IF v_item.variant_id IS NOT NULL THEN
      SELECT public.decrement_variant_stock(v_item.variant_id, v_item.quantity) INTO v_var_res;
      IF (v_var_res->>'success') <> 'true' THEN
        RAISE EXCEPTION 'Stok varian % tidak cukup', v_item.prod_name;
      END IF;
    END IF;
    v_total_cogs := v_total_cogs + (v_item.quantity * COALESCE(v_item.cost_price, 0));
  END LOOP;

  UPDATE sales SET
    cogs = v_total_cogs, gross_profit = total - v_total_cogs, stock_deducted = true, status = 'completed'
  WHERE id = p_sale_id;

  RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id, 'total_cogs', v_total_cogs, 'gross_profit', v_sale.total - v_total_cogs);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$function$;


-- ============================================================
-- VERIFIKASI (jalankan terpisah)
-- ============================================================
-- Resep varian spesifik (ganti UUID):
-- SELECT get_recipe_id_for_product('<product_id>', '<variant_id>');
--
-- Tidak ada overload (harus 1 baris per fungsi):
-- SELECT pronargs, pg_get_function_arguments(oid)
--   FROM pg_proc WHERE proname IN ('get_recipe_id_for_product','complete_production_batch','process_sale');
--
-- Kolom ada:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='production_batches' AND column_name='variant_id';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='product_inventory' AND column_name='variant_id';
