-- ============================================================================
-- 000069: RPC get_order_actions — server-driven action buttons
-- ============================================================================
-- Returns what actions are available for an order, so the UI doesn't hardcode
-- status transitions. The UI only renders what the server says is valid.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_order_actions(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_can_confirm_payment BOOLEAN := false;
  v_can_cancel BOOLEAN := false;
  v_next_statuses TEXT[] := '{}';
BEGIN
  SELECT id, status, payment_status
  INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'can_confirm_payment', false,
      'can_cancel', false,
      'valid_next_statuses', '{}'::text[]
    );
  END IF;

  -- Can confirm payment: not yet paid and not cancelled
  v_can_confirm_payment := (v_order.payment_status IS NULL OR v_order.payment_status != 'PAID')
                           AND v_order.status != 'CANCELLED';

  -- Can cancel: only NEW or PAID
  v_can_cancel := v_order.status IN ('NEW', 'PAID');

  -- Valid next statuses based on current status
  -- These match the RPC validation logic in rpc_start_production, etc.
  IF v_order.status = 'NEW' OR v_order.status = 'PAID' THEN
    v_next_statuses := ARRAY['IN_PRODUCTION'];
  ELSIF v_order.status = 'IN_PRODUCTION' THEN
    v_next_statuses := ARRAY['READY_FOR_PICKUP'];
  ELSIF v_order.status = 'READY_FOR_PICKUP' THEN
    v_next_statuses := ARRAY['COMPLETED'];
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'can_confirm_payment', v_can_confirm_payment,
    'can_cancel', v_can_cancel,
    'valid_next_statuses', v_next_statuses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_actions(UUID) TO authenticated;
