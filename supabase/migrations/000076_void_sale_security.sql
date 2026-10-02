-- ============================================================================
-- 000076: void_sale — add assert_role check
-- ============================================================================
-- Problem: void_sale RPC exists in live DB but has no migration file and
-- no assert_role check. Anyone with the anon key could call it directly.
--
-- Fix: Recreate void_sale with assert_role check. The function:
--   1. Validates caller is owner or cashier
--   2. Checks sale exists and is not already cancelled/refunded
--   3. Reverses stock (product or variant)
--   4. Creates reversal journal entry
--   5. Updates sale status to 'cancelled'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_sale(p_sale_id UUID, p_user_id UUID, p_reason TEXT DEFAULT NULL)
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
  v_reversal_amount NUMERIC;
BEGIN
  -- Security: assert caller is owner or cashier
  PERFORM assert_role(p_user_id, ARRAY['owner', 'cashier']);

  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sale not found');
  END IF;

  IF v_sale.status IN ('cancelled', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sale already cancelled/refunded');
  END IF;

  -- Reverse stock for each sale item
  FOR v_item IN
    SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      -- Variant stock reversal
      SELECT stock INTO v_stock_before FROM product_variants WHERE id = v_item.variant_id FOR UPDATE;
      v_stock_after := COALESCE(v_stock_before, 0) + v_item.quantity;
      UPDATE product_variants SET stock = v_stock_after, updated_at = now() WHERE id = v_item.variant_id;
      INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id)
      VALUES ('product_variant', v_item.variant_id, 'sale_reversal', v_item.quantity, 'pcs', COALESCE(v_stock_before, 0), v_stock_after, 'sale', p_sale_id);
    ELSIF v_item.product_id IS NOT NULL THEN
      -- Product stock reversal
      SELECT current_stock INTO v_stock_before FROM products WHERE id = v_item.product_id FOR UPDATE;
      v_stock_after := COALESCE(v_stock_before, 0) + v_item.quantity;
      UPDATE products SET current_stock = v_stock_after, updated_at = now() WHERE id = v_item.product_id;
      INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id)
      VALUES ('product', v_item.product_id, 'sale_reversal', v_item.quantity, 'pcs', COALESCE(v_stock_before, 0), v_stock_after, 'sale', p_sale_id);
    END IF;
  END LOOP;

  -- Create reversal journal entry
  v_reversal_amount := COALESCE(v_sale.total, 0);
  INSERT INTO journal_entries (entry_date, source, reference_type, reference_id, description, created_by)
  VALUES (current_date, 'reversal', 'sale', p_sale_id,
          COALESCE(p_reason, 'Pembatalan transaksi') || ' - ' || v_sale.invoice_number,
          p_user_id);

  -- Update sale status
  UPDATE sales SET status = 'cancelled', updated_at = now() WHERE id = p_sale_id;

  RETURN jsonb_build_object('success', true, 'stock_reversed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_sale(UUID, UUID, TEXT) TO authenticated;
