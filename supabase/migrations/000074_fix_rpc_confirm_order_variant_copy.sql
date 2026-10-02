-- ============================================================================
-- 000074: Fix rpc_confirm_order — copy variant_id + addon_detail to sale_items
-- ============================================================================
-- Problem: Migration 000071b overwrote rpc_confirm_order with a version that
-- only copies basic columns (product_id, product_name, quantity, unit_price,
-- subtotal) from order_items → sale_items. This means process_sale() sees
-- variant_id IS NULL and falls into the PRODUCT branch, decrementing the
-- parent product's stock instead of the variant's stock.
--
-- Fix: Rewrite rpc_confirm_order to also copy variant_id, variant_name,
-- variant_price, and addon_detail from order_items → sale_items.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_confirm_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order   orders%ROWTYPE;
  v_sale_id uuid;
  v_inv     text;
  v_item    record;
BEGIN
  PERFORM assert_role(p_user_id, ARRAY['owner', 'cashier']);

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Idempotent: if sale already exists, return it
  IF v_order.sale_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true,
      'sale_id', v_order.sale_id,
      'invoice_number', v_order.order_number
    );
  END IF;

  IF v_order.status NOT IN ('NEW', 'PAID') THEN
    RAISE EXCEPTION 'Hanya order NEW/PAID yang bisa dikonfirmasi';
  END IF;

  -- Create sale header
  v_inv := generate_invoice_number();
  INSERT INTO sales (
    invoice_number, subtotal, discount_amount, discount_percent, tax_amount, total,
    payment_method, payment_amount, change_amount, customer_name, notes, status,
    cashier_id, stock_deducted
  ) VALUES (
    v_inv, COALESCE(v_order.subtotal, 0), COALESCE(v_order.discount, 0), 0, 0,
    COALESCE(v_order.total_amount, v_order.total, 0),
    'transfer', COALESCE(v_order.total_amount, v_order.total, 0), 0,
    v_order.customer_name, v_order.notes, 'completed', p_user_id, false
  ) RETURNING id INTO v_sale_id;

  -- Copy order_items → sale_items, INCLUDING variant_id + addon_detail
  -- so process_sale() deducts the correct stock bucket (variant vs product).
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    INSERT INTO sale_items (
      sale_id, product_id, product_name, quantity, unit_price, subtotal,
      variant_id, variant_name, variant_price, addon_detail
    ) VALUES (
      v_sale_id, v_item.product_id, COALESCE(v_item.product_name, 'Produk'),
      v_item.quantity, COALESCE(v_item.unit_price, v_item.price, 0),
      COALESCE(v_item.subtotal, v_item.total, 0),
      v_item.variant_id, v_item.variant_name, v_item.variant_price,
      COALESCE(v_item.addon_detail, '[]'::jsonb)
    );
  END LOOP;

  -- Deduct stock via process_sale (now sale_items carries variant_id)
  PERFORM process_sale(p_sale_id := v_sale_id);

  -- Mark order PAID + link sale
  UPDATE orders
  SET status = 'PAID',
      sale_id = v_sale_id,
      payment_status = 'PAID',
      payment_confirmed_at = now(),
      payment_confirmed_by = p_user_id,
      confirmed_at = now(),
      confirmed_by = p_user_id,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true, 'sale_id', v_sale_id, 'invoice_number', v_inv
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_confirm_order(UUID, UUID) TO authenticated;
