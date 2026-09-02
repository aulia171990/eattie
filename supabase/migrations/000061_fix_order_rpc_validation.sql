-- Migration: 000061_fix_order_rpc_validation.sql
-- Perbaiki rpc_complete_order: hanya boleh dari DELIVERED
-- Perbaiki rpc_mark_paid: hanya boleh untuk order COMPLETED yang blmada PAID

-- 1. Fix rpc_complete_order: restrict hanya dari DELIVERED
CREATE OR REPLACE FUNCTION rpc_complete_order(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  IF v_status != 'DELIVERED' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order yang sudah diantar (DELIVERED) yang bisa diselesaikan');
  END IF;

  UPDATE orders
  SET status = 'COMPLETED',
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Fix rpc_mark_paid: hanya boleh untuk order COMPLETED yang blmada PAID
CREATE OR REPLACE FUNCTION rpc_mark_paid(p_order_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  -- Hanya order yang sudah selesai (COMPLETED) boleh di-mark PAID
  IF v_order.status != 'COMPLETED' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order yang sudah selesai (COMPLETED) yang bisa di-mark PAID');
  END IF;

  -- Idempoten: sudah PAID?
  IF v_order.payment_status = 'PAID' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true);
  END IF;

  UPDATE orders
  SET payment_status = 'PAID',
      payment_confirmed_at = NOW(),
      payment_confirmed_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_complete_order(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rpc_mark_paid(UUID, UUID) TO anon, authenticated, service_role;
