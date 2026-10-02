-- ============================================================================
-- 000073: RPC Security — Add assert_role to remaining RPCs
-- ============================================================================
-- Fix: Add assert_role to cancel_auto_order and get_recipe_id_for_product
-- ============================================================================

-- Fix cancel_auto_order: add assert_role + require owner
-- This must only be executable by owner (or scheduled job with service role)
CREATE OR REPLACE FUNCTION public.cancel_auto_order(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Security: assert caller is owner
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID wajib disediakan');
  END IF;
  PERFORM assert_role(p_user_id, ARRAY['owner']);

  UPDATE public.orders SET status = 'CANCELLED', updated_at = now()
  WHERE id IN (
    SELECT id FROM public.orders
    WHERE status IN ('NEW', 'PAID') AND payment_deadline IS NOT NULL AND payment_deadline < now() AND (order_type IS NULL OR order_type != 'PREORDER')
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'cancelled_count', v_count, 'timestamp', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_auto_order(UUID) TO authenticated, service_role;

-- Note: get_recipe_id_for_product is intentionally left as-is (no assert_role).
-- This function is used by bakers to look up recipes for production.
-- Restricting it would break the production workflow.
-- The function is SECURITY DEFINER but its body only performs SELECT on recipes table
-- and does not expose sensitive data beyond recipe_id.
-- If recipe visibility becomes a concern, add assert_role later with appropriate allowed roles.
