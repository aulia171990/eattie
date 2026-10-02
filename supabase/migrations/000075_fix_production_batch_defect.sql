-- ============================================================================
-- 000075: Fix complete_production_batch — subtract quantity_defect from stock
-- ============================================================================
-- Problem: complete_production_batch adds the FULL p_quantity_produced to
-- product/variant stock, ignoring p_quantity_defect. Defective units should
-- NOT be added to sellable stock.
--
-- Fix: Subtract p_quantity_defect from the stock increment, and adjust
-- cost_per_unit to spread total cost over good units only.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_production_batch(
  p_batch_id UUID,
  p_quantity_produced INTEGER,
  p_quantity_defect INTEGER DEFAULT 0,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_recipe RECORD;
  v_ri RECORD;
  v_ing RECORD;
  v_needed NUMERIC;
  v_base_qty NUMERIC;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_prod_before NUMERIC;
  v_prod_after NUMERIC;
  v_var_before NUMERIC;
  v_var_after NUMERIC;
  v_total_cost NUMERIC := 0;
  v_cost_per_unit NUMERIC;
  v_scale_factor NUMERIC;
  v_errors TEXT[] := '{}';
  v_good_quantity INTEGER;
BEGIN
  -- Security: assert caller has access (owner or baker)
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID wajib disediakan';
  END IF;
  PERFORM assert_role(p_user_id, ARRAY['owner', 'baker']);

  IF p_quantity_produced < 0 THEN RAISE EXCEPTION 'quantity_produced cannot be negative'; END IF;
  IF p_quantity_defect < 0 THEN RAISE EXCEPTION 'quantity_defect cannot be negative'; END IF;
  IF p_quantity_defect > p_quantity_produced THEN RAISE EXCEPTION 'quantity_defect cannot exceed quantity_produced'; END IF;

  SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Production batch % not found', p_batch_id; END IF;
  IF v_batch.status = 'completed' THEN RAISE EXCEPTION 'Batch % already completed', p_batch_id; END IF;
  IF v_batch.stock_consumed THEN RAISE EXCEPTION 'Batch % stock already consumed', p_batch_id; END IF;

  SELECT * INTO v_recipe FROM recipes WHERE id = v_batch.recipe_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No recipe found for batch %', p_batch_id; END IF;

  v_scale_factor := p_quantity_produced::NUMERIC / NULLIF(v_recipe.yield_quantity, 0);

  FOR v_ri IN
    SELECT ri.*, i.name AS ing_name, i.current_stock, i.base_unit
    FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = v_recipe.id
  LOOP
    v_base_qty := convert_base_unit(v_ri.quantity, v_ri.unit, v_ri.base_unit);
    IF v_base_qty IS NULL THEN
      v_errors := array_append(v_errors, format('Satuan resep %s (%s) tidak cocok dengan satuan dasar bahan %s (%s)', v_ri.ing_name, v_ri.unit, v_ri.ing_name, v_ri.base_unit));
      CONTINUE;
    END IF;
    v_needed := v_base_qty * v_scale_factor;
    IF v_ri.current_stock < v_needed THEN
      v_errors := array_append(v_errors, format('Stok %s tidak cukup: butuh %.3f %s, tersisa %.3f %s', v_ri.ing_name, v_needed, v_ri.base_unit, v_ri.current_stock, v_ri.base_unit));
    END IF;
  END LOOP;
  IF array_length(v_errors, 1) > 0 THEN RAISE EXCEPTION 'Stok tidak mencukupi / satuan tidak valid: %', array_to_string(v_errors, '; '); END IF;

  FOR v_ri IN
    SELECT ri.*, i.current_stock, i.base_unit, i.average_cost, i.price_per_unit
    FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = v_recipe.id FOR UPDATE OF i
  LOOP
    v_base_qty := convert_base_unit(v_ri.quantity, v_ri.unit, v_ri.base_unit);
    v_needed := v_base_qty * v_scale_factor;
    v_stock_before := v_ri.current_stock;
    v_stock_after := v_stock_before - v_needed;
    v_unit_cost := COALESCE(v_ri.average_cost, v_ri.price_per_unit, 0);
    UPDATE ingredients SET current_stock = v_stock_after, updated_at = now() WHERE id = v_ri.ingredient_id;
    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
    VALUES ('ingredient', v_ri.ingredient_id, 'production_out', v_needed, v_ri.base_unit, v_stock_before, v_stock_after, v_unit_cost, v_needed * v_unit_cost, 'production', p_batch_id);
    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id)
    VALUES (v_ri.ingredient_id, 'production_out', v_needed, v_ri.base_unit, v_stock_before, v_stock_after, 'production', p_batch_id);
    v_total_cost := v_total_cost + (v_needed * v_unit_cost);
  END LOOP;

  -- Good quantity = produced - defective
  v_good_quantity := p_quantity_produced - COALESCE(p_quantity_defect, 0);
  v_cost_per_unit := CASE WHEN v_good_quantity > 0 THEN v_total_cost / v_good_quantity ELSE 0 END;

  -- Add GOOD quantity only to product stock
  SELECT current_stock INTO v_prod_before FROM products WHERE id = v_batch.product_id FOR UPDATE;
  v_prod_after := COALESCE(v_prod_before, 0) + v_good_quantity;
  UPDATE products SET current_stock = v_prod_after, cost_price = v_cost_per_unit, updated_at = now() WHERE id = v_batch.product_id;
  INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
  VALUES ('product', v_batch.product_id, 'production_in', v_good_quantity, 'pcs', COALESCE(v_prod_before, 0), v_prod_after, v_cost_per_unit, v_total_cost, 'production', p_batch_id);

  -- Add GOOD quantity only to variant stock
  IF v_batch.variant_id IS NOT NULL THEN
    SELECT stock INTO v_var_before FROM product_variants WHERE id = v_batch.variant_id FOR UPDATE;
    v_var_after := COALESCE(v_var_before, 0) + v_good_quantity;
    UPDATE product_variants SET stock = v_var_after, updated_at = now() WHERE id = v_batch.variant_id;
    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
    VALUES ('product_variant', v_batch.variant_id, 'production_in', v_good_quantity, 'pcs', COALESCE(v_var_before, 0), v_var_after, v_cost_per_unit, v_total_cost, 'production', p_batch_id);
  END IF;

  UPDATE production_batches SET status = 'completed', quantity_produced = p_quantity_produced, quantity_defect = p_quantity_defect, cost_per_unit = v_cost_per_unit, total_cost = v_total_cost, stock_consumed = true, completed_at = now(), updated_at = now() WHERE id = p_batch_id;
  INSERT INTO product_inventory (product_id, variant_id, batch_id, quantity) VALUES (v_batch.product_id, v_batch.variant_id, p_batch_id, v_good_quantity);

  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id, 'quantity_produced', p_quantity_produced, 'quantity_defect', p_quantity_defect, 'good_quantity', v_good_quantity, 'total_cost', v_total_cost, 'cost_per_unit', v_cost_per_unit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_production_batch(UUID, INTEGER, INTEGER, UUID) TO authenticated;
