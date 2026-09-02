-- ============================================================
-- Production ↔ Product Variant linkage
-- ============================================================
-- Root cause: production_batches had no variant_id, and the live
-- complete_production_batch() RPC added finished goods only to
-- products.current_stock (generic), never to the specific variant.
-- So producing "Roti Coklat" increased the generic product stock,
-- not the Coklat variant's stock.
--
-- Fix:
--   1. Add variant_id to production_batches + product_inventory.
--   2. Rewrite complete_production_batch() so finished goods go to
--      product_variants.stock when the batch has a variant_id,
--      while keeping products.current_stock + product_inventory rows
--      (the latter now also carries variant_id).
--
-- Idempotent / safe to re-run.

-- 1. Columns
ALTER TABLE public.production_batches
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

ALTER TABLE public.product_inventory
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_production_batches_variant
  ON public.production_batches (variant_id);

-- 2. Replace RPC. PostgREST needs the signature unchanged to avoid
--    overload; we keep (p_batch_id, p_quantity_produced, p_quantity_defect).
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
  -- Validate inputs
  IF p_quantity_produced < 0 THEN
    RAISE EXCEPTION 'quantity_produced cannot be negative';
  END IF;
  IF p_quantity_defect < 0 THEN
    RAISE EXCEPTION 'quantity_defect cannot be negative';
  END IF;

  -- Lock batch
  SELECT * INTO v_batch
  FROM production_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production batch % not found', p_batch_id;
  END IF;

  IF v_batch.status = 'completed' THEN
    RAISE EXCEPTION 'Batch % already completed', p_batch_id;
  END IF;

  IF v_batch.stock_consumed THEN
    RAISE EXCEPTION 'Batch % stock already consumed', p_batch_id;
  END IF;

  -- Get recipe
  SELECT * INTO v_recipe
  FROM recipes
  WHERE id = v_batch.recipe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No recipe found for batch %', p_batch_id;
  END IF;

  -- Scale factor: how many recipe batches we're producing
  v_scale_factor := p_quantity_produced::NUMERIC / NULLIF(v_recipe.yield_quantity, 0);

  -- ---- VALIDATION PASS: check all ingredients have enough stock ----
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

  -- ---- CONSUME PASS: deduct ingredients ----
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
      v_needed, v_ri.unit,
      v_stock_before, v_stock_after,
      COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0),
      v_needed * COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0),
      'production', p_batch_id
    );

    INSERT INTO stock_movements (
      ingredient_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id
    ) VALUES (
      v_ri.ingredient_id, 'production_out',
      v_needed, v_ri.unit,
      v_stock_before, v_stock_after,
      'production', p_batch_id
    );

    v_total_cost := v_total_cost + (v_needed * COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0));
  END LOOP;

  -- ---- ADD FINISHED GOODS ----
  v_cost_per_unit := CASE WHEN p_quantity_produced > 0
    THEN v_total_cost / p_quantity_produced
    ELSE 0
  END;

  -- Generic product stock (always updated for aggregate reporting)
  SELECT current_stock INTO v_prod_before
  FROM products WHERE id = v_batch.product_id FOR UPDATE;

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

  -- Variant stock (when the batch targets a specific variant)
  IF v_batch.variant_id IS NOT NULL THEN
    SELECT stock INTO v_var_before
    FROM product_variants WHERE id = v_batch.variant_id FOR UPDATE;

    v_var_after := COALESCE(v_var_before, 0) + p_quantity_produced;

    UPDATE product_variants SET
      stock      = v_var_after,
      updated_at = now()
    WHERE id = v_batch.variant_id;

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

  -- ---- UPDATE BATCH ----
  UPDATE production_batches SET
    status             = 'completed',
    quantity_produced  = p_quantity_produced,
    quantity_defect    = p_quantity_defect,
    cost_per_unit      = v_cost_per_unit,
    total_cost         = v_total_cost,
    stock_consumed     = true,
    completed_at       = now(),
    updated_at         = now()
  WHERE id = p_batch_id;

  -- Batch tracking row (carries variant_id when present)
  INSERT INTO product_inventory (product_id, variant_id, batch_id, quantity)
  VALUES (v_batch.product_id, v_batch.variant_id, p_batch_id, p_quantity_produced);

  RETURN jsonb_build_object(
    'success',           true,
    'batch_id',          p_batch_id,
    'quantity_produced', p_quantity_produced,
    'quantity_defect',   p_quantity_defect,
    'total_cost',        v_total_cost,
    'cost_per_unit',     v_cost_per_unit
  );
END;
$function$;
