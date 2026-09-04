-- ============================================================================
-- 000071 (cont): RPC Security — Add role checks to remaining order RPCs
-- ============================================================================

-- rpc_cancel_order — owner/cashier
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


-- rpc_start_production — owner only
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


-- rpc_ready_for_pickup — owner only
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


-- rpc_deliver_order — owner only
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


-- rpc_complete_order — owner only
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
  IF v_status NOT IN ('DELIVERED', 'READY_FOR_PICKUP') THEN RETURN jsonb_build_object('success', false, 'error', 'Hanya order DELIVERED/READY_FOR_PICKUP yang bisa diselesaikan'); END IF;

  UPDATE orders SET status = 'COMPLETED', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


-- rpc_mark_paid — owner/cashier
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


-- rpc_confirm_order — owner/cashier
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
