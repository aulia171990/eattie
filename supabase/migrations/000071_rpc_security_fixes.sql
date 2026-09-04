-- ============================================================================
-- 000071: RPC Security — Add role checks to SECURITY DEFINER functions
-- ============================================================================
-- Many RPC functions are SECURITY DEFINER but lack auth/role checks.
-- This means anyone with the anon key can call them directly via REST API.
--
-- Fix: Add assert_role() helper + role checks to all critical RPCs.
-- ============================================================================

-- Helper: assert user has one of the allowed roles
CREATE OR REPLACE FUNCTION public.assert_role(p_user_id UUID, p_allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
  IF v_role IS NULL OR NOT (v_role = ANY(p_allowed_roles)) THEN
    RAISE EXCEPTION 'Akses ditolak: diperlukan role %', array_to_string(p_allowed_roles, ' atau ');
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_role(UUID, TEXT[]) TO authenticated;


-- 1. complete_production_batch — owner only
CREATE OR REPLACE FUNCTION public.complete_production_batch(p_batch_id UUID, p_quantity_produced INTEGER, p_quantity_defect INTEGER DEFAULT 0)
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
  v_scale_factor NUMERIC;
  v_total_cost NUMERIC := 0;
  v_cost_per_unit NUMERIC := 0;
  v_unit_cost NUMERIC;
  v_prod_before NUMERIC;
  v_prod_after NUMERIC;
  v_var_before NUMERIC;
  v_var_after NUMERIC;
  v_errors TEXT[] := '{}';
BEGIN
  IF p_quantity_produced < 0 THEN RAISE EXCEPTION 'quantity_produced cannot be negative'; END IF;
  IF p_quantity_defect < 0 THEN RAISE EXCEPTION 'quantity_defect cannot be negative'; END IF;

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

  UPDATE production_batches SET status = 'completed', quantity_produced = p_quantity_produced, quantity_defect = p_quantity_defect, cost_per_unit = v_cost_per_unit, total_cost = v_total_cost, stock_consumed = true, completed_at = now(), updated_at = now() WHERE id = p_batch_id;
  INSERT INTO product_inventory (product_id, variant_id, batch_id, quantity) VALUES (v_batch.product_id, v_batch.variant_id, p_batch_id, p_quantity_produced);

  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id, 'quantity_produced', p_quantity_produced, 'quantity_defect', p_quantity_defect, 'total_cost', v_total_cost, 'cost_per_unit', v_cost_per_unit);
END;
$$;


-- 2. process_sale — owner/cashier
CREATE OR REPLACE FUNCTION public.process_sale(p_sale_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_total_cogs NUMERIC := 0;
  v_errors TEXT[] := '{}';
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale % not found', p_sale_id; END IF;
  IF v_sale.stock_deducted THEN RAISE EXCEPTION 'Sale % already processed (anti double-submit)', p_sale_id; END IF;
  IF v_sale.status = 'cancelled' THEN RAISE EXCEPTION 'Sale % is cancelled', p_sale_id; END IF;

  FOR v_item IN
    SELECT si.*, p.name AS prod_name, p.current_stock AS product_stock, COALESCE(p.cost_price, 0) AS cost_price, pv.stock AS variant_stock_qty
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    LEFT JOIN public.product_variants pv ON pv.id = si.variant_id
    WHERE si.sale_id = p_sale_id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      IF v_item.variant_stock_qty IS NULL OR v_item.variant_stock_qty < v_item.quantity THEN
        v_errors := array_append(v_errors, format('Stok varian %s tidak cukup: butuh %s, tersisa %s', COALESCE(v_item.variant_name, v_item.prod_name), v_item.quantity, COALESCE(v_item.variant_stock_qty, 0)));
      END IF;
    ELSE
      IF v_item.product_stock < v_item.quantity THEN
        v_errors := array_append(v_errors, format('Stok %s tidak cukup: butuh %s, tersisa %.0f', v_item.prod_name, v_item.quantity, v_item.product_stock));
      END IF;
    END IF;
  END LOOP;
  IF array_length(v_errors, 1) > 0 THEN RAISE EXCEPTION 'Stok tidak mencukupi: %', array_to_string(v_errors, '; '); END IF;

  FOR v_item IN
    SELECT si.*, p.name AS prod_name, p.current_stock AS product_stock, COALESCE(p.cost_price, 0) AS cost_price
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id AND si.variant_id IS NULL FOR UPDATE OF p
  LOOP
    v_stock_before := v_item.product_stock;
    v_stock_after := v_stock_before - v_item.quantity;
    UPDATE public.products SET current_stock = v_stock_after, updated_at = now() WHERE id = v_item.product_id;
    INSERT INTO public.inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
    VALUES ('product', v_item.product_id, 'sale_out', v_item.quantity, 'pcs', v_stock_before, v_stock_after, v_item.cost_price, v_item.quantity * v_item.cost_price, 'sale', p_sale_id);
    v_total_cogs := v_total_cogs + (v_item.quantity * v_item.cost_price);
  END LOOP;

  FOR v_item IN
    SELECT si.*, p.name AS prod_name, COALESCE(p.cost_price, 0) AS cost_price, pv.stock AS variant_stock_qty
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    JOIN public.product_variants pv ON pv.id = si.variant_id
    WHERE si.sale_id = p_sale_id AND si.variant_id IS NOT NULL FOR UPDATE OF pv
  LOOP
    v_stock_before := v_item.variant_stock_qty;
    v_stock_after := v_stock_before - v_item.quantity;
    UPDATE public.product_variants SET stock = v_stock_after, updated_at = now() WHERE id = v_item.variant_id;
    INSERT INTO public.inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id)
    VALUES ('variant', v_item.variant_id, 'sale_out', v_item.quantity, 'pcs', v_stock_before, v_stock_after, v_item.cost_price, v_item.quantity * v_item.cost_price, 'sale', p_sale_id);
    v_total_cogs := v_total_cogs + (v_item.quantity * v_item.cost_price);
  END LOOP;

  UPDATE public.sales SET cogs = v_total_cogs, gross_profit = total - v_total_cogs, stock_deducted = true, status = 'completed' WHERE id = p_sale_id;
  RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id, 'total_cogs', v_total_cogs, 'gross_profit', v_sale.total - v_total_cogs);
END;
$$;


-- 3. process_purchase — owner only
CREATE OR REPLACE FUNCTION public.process_purchase(p_purchase_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
  v_item RECORD;
  v_ing RECORD;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_base_qty NUMERIC;
  v_price_base NUMERIC;
  v_base_unit TEXT;
  v_conv NUMERIC;
  v_new_avg_cost NUMERIC;
  v_processed INTEGER := 0;
BEGIN
  SELECT * INTO v_purchase FROM stock_purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase % not found', p_purchase_id; END IF;
  IF v_purchase.status = 'received' THEN RAISE EXCEPTION 'Purchase % already received', p_purchase_id; END IF;
  IF v_purchase.status = 'cancelled' THEN RAISE EXCEPTION 'Purchase % is cancelled', p_purchase_id; END IF;

  FOR v_item IN SELECT * FROM stock_purchase_items WHERE purchase_id = p_purchase_id LOOP
    CONTINUE WHEN v_item.quantity_received <= 0;
    SELECT * INTO v_ing FROM ingredients WHERE id = v_item.ingredient_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_conv := COALESCE(v_ing.conversion_rate, 1);
    IF v_conv = 0 THEN v_conv := 1; END IF;

    IF v_ing.purchase_unit IS NOT NULL AND v_ing.purchase_unit <> '' THEN
      v_base_qty := v_item.quantity_received * v_conv;
      v_price_base := v_item.unit_price / v_conv;
      v_base_unit := v_ing.base_unit;
    ELSE
      v_base_qty := v_item.quantity_received;
      v_price_base := v_item.unit_price;
      v_base_unit := v_item.unit;
    END IF;

    v_stock_before := v_ing.current_stock;
    v_stock_after := v_stock_before + v_base_qty;

    IF v_stock_before + v_base_qty > 0 THEN
      v_new_avg_cost := ((v_stock_before * COALESCE(v_ing.average_cost, v_ing.price_per_unit, 0)) + (v_base_qty * v_price_base)) / (v_stock_before + v_base_qty);
    ELSE
      v_new_avg_cost := v_price_base;
    END IF;

    UPDATE ingredients SET current_stock = v_stock_after, average_cost = v_new_avg_cost, last_purchase_price = v_price_base, price_per_unit = v_price_base, updated_at = now() WHERE id = v_item.ingredient_id;
    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id, batch_code, expiry_date, created_by)
    VALUES ('ingredient', v_item.ingredient_id, 'purchase_in', v_base_qty, v_base_unit, v_stock_before, v_stock_after, v_price_base, v_base_qty * v_price_base, 'purchase', p_purchase_id, v_item.batch_code, v_item.expiry_date, v_purchase.created_by);
    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id, batch_code, expiry_date, created_by)
    VALUES (v_item.ingredient_id, 'purchase_in', v_base_qty, v_base_unit, v_stock_before, v_stock_after, 'purchase', p_purchase_id, v_item.batch_code, v_item.expiry_date, v_purchase.created_by);
    v_processed := v_processed + 1;
  END LOOP;

  UPDATE stock_purchases SET status = 'received', received_date = CURRENT_DATE, updated_at = now() WHERE id = p_purchase_id;
  RETURN jsonb_build_object('success', true, 'items_processed', v_processed, 'purchase_id', p_purchase_id);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


-- 4. process_stock_opname — owner only
CREATE OR REPLACE FUNCTION public.process_stock_opname(p_opname_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname RECORD;
  v_item RECORD;
  v_diff NUMERIC;
  v_movtype TEXT;
  v_new_stock NUMERIC;
  v_adjusted INTEGER := 0;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_plus DECIMAL(14,2) := 0;
  v_total_minus DECIMAL(14,2) := 0;
BEGIN
  SELECT * INTO v_opname FROM stock_opnames WHERE id = p_opname_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Opname % not found', p_opname_id; END IF;
  IF v_opname.status = 'completed' THEN RAISE EXCEPTION 'Opname % already completed', p_opname_id; END IF;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');
  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'Stock Opname ' || v_opname.opname_number, 'opname', p_opname_id, COALESCE(v_opname.submitted_by, v_opname.created_by))
  RETURNING id INTO v_entry_id;

  FOR v_item IN
    SELECT soi.*, i.current_stock AS live_stock
    FROM stock_opname_items soi JOIN ingredients i ON i.id = soi.ingredient_id
    WHERE soi.opname_id = p_opname_id AND soi.actual_stock IS NOT NULL FOR UPDATE OF i
  LOOP
    v_diff := v_item.actual_stock - v_item.live_stock;
    UPDATE stock_opname_items SET difference = (v_item.actual_stock - v_item.system_stock) WHERE id = v_item.id;
    IF v_diff = 0 THEN CONTINUE; END IF;
    v_movtype := CASE WHEN v_diff > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END;
    v_new_stock := v_item.live_stock + v_diff;
    UPDATE ingredients SET current_stock = v_new_stock, updated_at = now() WHERE id = v_item.ingredient_id;
    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id, reason)
    VALUES ('ingredient', v_item.ingredient_id, 'opname_adjustment', ABS(v_diff), v_item.unit, v_item.live_stock, v_new_stock, 'opname', p_opname_id, COALESCE(v_item.reason, 'Stock opname adjustment'));
    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id, reason)
    VALUES (v_item.ingredient_id, v_movtype::TEXT, ABS(v_diff), v_item.unit, v_item.live_stock, v_new_stock, 'opname', p_opname_id, COALESCE(v_item.reason, 'Stock opname adjustment'));
    IF v_diff > 0 THEN
      v_total_plus := v_total_plus + (ABS(v_diff) * COALESCE((SELECT average_cost FROM ingredients WHERE id = v_item.ingredient_id), 0));
    ELSE
      v_total_minus := v_total_minus + (ABS(v_diff) * COALESCE((SELECT average_cost FROM ingredients WHERE id = v_item.ingredient_id), 0));
    END IF;
    v_adjusted := v_adjusted + 1;
  END LOOP;

  IF v_total_plus > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_plus, 0, 'Stok opname - selisih plus' FROM chart_of_accounts WHERE code = '1300';
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_plus, 'Stok opname - selisih plus' FROM chart_of_accounts WHERE code = '5800';
  END IF;
  IF v_total_minus > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_minus, 0, 'Stok opname - selisih minus' FROM chart_of_accounts WHERE code = '5800';
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_minus, 'Stok opname - selisih minus' FROM chart_of_accounts WHERE code = '1300';
  END IF;

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  UPDATE stock_opnames SET status = 'completed', completed_at = now() WHERE id = p_opname_id;
  RETURN jsonb_build_object('success', true, 'opname_id', p_opname_id, 'items_adjusted', v_adjusted);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


-- 5. update_production_batch_status — owner only
CREATE OR REPLACE FUNCTION public.update_production_batch_status(p_batch_id UUID, p_new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
BEGIN
  SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Batch tidak ditemukan'); END IF;
  IF v_batch.status = 'completed' THEN RETURN jsonb_build_object('success', false, 'error', 'Batch sudah selesai, tidak bisa di-update'); END IF;
  IF v_batch.status = 'cancelled' THEN RETURN jsonb_build_object('success', false, 'error', 'Batch sudah dibatalkan, tidak bisa di-update'); END IF;

  IF p_new_status = 'in_progress' THEN
    IF v_batch.status != 'planned' THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya batch dengan status planned yang bisa dimulai produksi'); END IF;
    UPDATE production_batches SET status = 'in_progress', started_at = NOW(), updated_at = NOW() WHERE id = p_batch_id;
    RETURN jsonb_build_object('success', true, 'status', 'in_progress');
  ELSIF p_new_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transisi ke completed harus melalui complete_production_batch() RPC');
  ELSIF p_new_status = 'cancelled' THEN
    IF v_batch.status NOT IN ('planned', 'in_progress') THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya batch planned atau in_progress yang bisa dibatalkan'); END IF;
    UPDATE production_batches SET status = 'cancelled', updated_at = NOW() WHERE id = p_batch_id;
    RETURN jsonb_build_object('success', true, 'status', 'cancelled');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', format('Status tidak valid: %s', p_new_status));
  END IF;
END;
$$;


-- 6. decrement_variant_stock — owner/cashier
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(p_variant_id UUID, p_qty INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'qty harus positif'); END IF;
  SELECT stock INTO v_current FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
  IF v_current IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'varian tidak ditemukan'); END IF;
  IF v_current < p_qty THEN RETURN jsonb_build_object('success', false, 'error', 'stok varian tidak cukup', 'available', v_current, 'requested', p_qty); END IF;
  UPDATE public.product_variants SET stock = stock - p_qty, updated_at = now() WHERE id = p_variant_id;
  RETURN jsonb_build_object('success', true, 'remaining', v_current - p_qty);
END;
$$;


-- 7. confirm_order — owner/cashier
CREATE OR REPLACE FUNCTION public.confirm_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_sale_id UUID;
  v_inv_num TEXT;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner', 'cashier']);

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.sale_id IS NOT NULL THEN RAISE EXCEPTION 'Order already converted to sale'; END IF;

  v_inv_num := generate_invoice_number();
  INSERT INTO sales (invoice_number, subtotal, discount_amount, discount_percent, tax_amount, total, payment_method, payment_amount, change_amount, customer_name, notes, status, cashier_id, stock_deducted)
  VALUES (v_inv_num, COALESCE(v_order.subtotal, 0), COALESCE(v_order.discount, 0), 0, 0, COALESCE(v_order.total_amount, v_order.total, 0), 'transfer', COALESCE(v_order.total_amount, v_order.total, 0), 0, v_order.customer_name, v_order.notes, 'completed', p_user_id, false)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES (v_sale_id, v_item.product_id, COALESCE(v_item.product_name, 'Produk'), v_item.quantity, COALESCE(v_item.unit_price, v_item.price, 0), COALESCE(v_item.subtotal, v_item.total, 0));
  END LOOP;

  UPDATE orders SET status = 'COMPLETED', sale_id = v_sale_id, confirmed_at = now(), confirmed_by = p_user_id, payment_status = 'PAID', payment_confirmed_at = now(), payment_confirmed_by = p_user_id, updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'invoice_number', v_inv_num);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


-- 8. cancel_auto_order — owner only (cron job)
CREATE OR REPLACE FUNCTION public.cancel_auto_order()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.orders SET status = 'CANCELLED', updated_at = now()
  WHERE id IN (
    SELECT id FROM public.orders
    WHERE status IN ('NEW', 'PAID') AND payment_deadline IS NOT NULL AND payment_deadline < now() AND (order_type IS NULL OR order_type != 'PREORDER')
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'cancelled_count', v_count, 'timestamp', now());
END;
$$;


-- 9. rpc_cancel_order — owner/cashier
CREATE OR REPLACE FUNCTION public.rpc_cancel_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner', 'cashier']);

  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan'); END IF;
  IF v_status NOT IN ('NEW', 'PAID') THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya order NEW/PAID yang bisa dibatalkan'); END IF;

  UPDATE orders SET status = 'CANCELLED', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 10. rpc_start_production — owner only
CREATE OR REPLACE FUNCTION public.rpc_start_production(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner']);

  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan'); END IF;
  IF v_status NOT IN ('NEW', 'PAID') THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya order NEW/PAID yang bisa mulai produksi'); END IF;

  UPDATE orders SET status = 'IN_PRODUCTION', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 11. rpc_ready_for_pickup — owner only
CREATE OR REPLACE FUNCTION public.rpc_ready_for_pickup(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner']);

  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan'); END IF;
  IF v_status != 'IN_PRODUCTION' THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya order IN_PRODUCTION yang bisa di-set siap ambil'); END IF;

  UPDATE orders SET status = 'READY_FOR_PICKUP', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 12. rpc_deliver_order — owner only
CREATE OR REPLACE FUNCTION public.rpc_deliver_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner']);

  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan'); END IF;
  IF v_status != 'READY_FOR_PICKUP' THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya order READY_FOR_PICKUP yang bisa diantar'); END IF;

  UPDATE orders SET status = 'DELIVERED', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 13. rpc_complete_order — owner only
CREATE OR REPLACE FUNCTION public.rpc_complete_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner']);

  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan'); END IF;
  IF v_status != 'DELIVERED' AND v_status != 'READY_FOR_PICKUP' THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya order DELIVERED/READY_FOR_PICKUP yang bisa diselesaikan'); END IF;

  UPDATE orders SET status = 'COMPLETED', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 14. rpc_mark_paid — owner/cashier
CREATE OR REPLACE FUNCTION public.rpc_mark_paid(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner', 'cashier']);

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan'); END IF;
  IF v_order.payment_status = 'PAID' THEN RETURN jsonb_build_object('success', true, 'idempotent', true); END IF;

  UPDATE orders SET payment_status = 'PAID', payment_confirmed_at = now(), payment_confirmed_by = p_user_id, updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 15. rpc_confirm_order — owner/cashier
CREATE OR REPLACE FUNCTION public.rpc_confirm_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_sale_id UUID;
  v_inv_num TEXT;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner', 'cashier']);

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.sale_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'sale_id', v_order.sale_id);
  END IF;

  v_inv_num := generate_invoice_number();
  INSERT INTO sales (invoice_number, subtotal, discount_amount, discount_percent, tax_amount, total, payment_method, payment_amount, change_amount, customer_name, notes, status, cashier_id, stock_deducted)
  VALUES (v_inv_num, COALESCE(v_order.subtotal, 0), COALESCE(v_order.discount, 0), 0, 0, COALESCE(v_order.total_amount, v_order.total, 0), 'transfer', COALESCE(v_order.total_amount, v_order.total, 0), 0, v_order.customer_name, v_order.notes, 'completed', p_user_id, false)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES (v_sale_id, v_item.product_id, COALESCE(v_item.product_name, 'Produk'), v_item.quantity, COALESCE(v_item.unit_price, v_item.price, 0), COALESCE(v_item.subtotal, v_item.total, 0));
  END LOOP;

  UPDATE orders SET status = 'PAID', sale_id = v_sale_id, confirmed_at = now(), confirmed_by = p_user_id, payment_status = 'PAID', payment_confirmed_at = now(), payment_confirmed_by = p_user_id, updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'invoice_number', v_inv_num);
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;
