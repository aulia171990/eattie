-- ============================================================================
-- 000049: rpc_confirm_order() must carry variant_id + addon_detail into
--         sale_items so process_sale() deducts the correct stock bucket.
--
-- WHY: The reconstructed rpc_confirm_order in 000000_order_status_rpcs.sql
--      copied order_items -> sale_items with only the basic columns
--      (product_id, product_name, quantity, unit_price, subtotal). It did
--      NOT copy variant_id / addon_detail. process_sale() branches on
--      sale_items.variant_id to decide whether to decrement
--      product_variants.stock (variant) or products.current_stock (product).
--      Without variant_id, an online order for a VARIANT would fall into the
--      product-stock branch and either fail the stock check or wrongly
--      decrement the parent product's stock — leaving the variant's stock
--      untouched. This makes online sales inconsistent with the POS flow.
--
-- FIX: Rewrite rpc_confirm_order() to copy variant_id + addon_detail
--      (and variant_name/variant_price for record completeness) from
--      order_items into sale_items, matching how createSale() (POS) builds
--      sale_items. process_sale() then deducts the correct bucket.
--
-- IDEMPOTENT: CREATE OR REPLACE with full corrected body. Safe to run even
--             if the live function already exists / already copies variant_id
--             (it simply replaces with an equivalent-or-better definition).
--             Signature + return type unchanged:
--               (p_order_id uuid, p_user_id uuid) -> jsonb
--               { success bool, error text, sale_id uuid,
--                 invoice_number text, idempotent bool }
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_confirm_order(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
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
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  -- Idempoten: kalau sale sudah dibuat, kembalikan yang ada
  IF v_order.sale_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true,
      'sale_id', v_order.sale_id,
      'invoice_number', v_order.order_number
    );
  END IF;

  IF v_order.status NOT IN ('NEW', 'PAID') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order NEW/PAID yang bisa dikonfirmasi');
  END IF;

  -- Buat sale header
  SELECT generate_invoice_number() INTO v_inv;
  INSERT INTO sales (
    invoice_number, subtotal, discount_amount, tax_amount, total,
    payment_method, customer_name, notes, status, cashier_id
  ) VALUES (
    v_inv, v_order.subtotal, v_order.discount_amount, 0, v_order.total_amount,
    'cash', v_order.customer_name, v_order.notes, 'pending', p_user_id
  ) RETURNING id INTO v_sale_id;

  -- Copy order_items -> sale_items, INCLUDING variant_id + addon_detail so
  -- process_sale() deducts the correct stock bucket (variant vs product).
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    INSERT INTO sale_items (
      sale_id, product_id, product_name, quantity, unit_price, subtotal,
      variant_id, variant_name, variant_price, addon_detail
    ) VALUES (
      v_sale_id, v_item.product_id, v_item.product_name,
      v_item.quantity, v_item.unit_price, v_item.subtotal,
      v_item.variant_id, v_item.variant_name, v_item.variant_price,
      COALESCE(v_item.addon_detail, '[]'::jsonb)
    );
  END LOOP;

  -- Kurangi stok via RPC yang sudah ada di live (process_sale).
  -- Sekarang sale_items membawa variant_id, jadi cabang variant di
  -- process_sale() akan decrement product_variants.stock dengan benar.
  PERFORM process_sale(p_sale_id := v_sale_id);

  -- Tandai order PAID + hubungkan sale
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

GRANT EXECUTE ON FUNCTION public.rpc_confirm_order(uuid, uuid) TO authenticated;
