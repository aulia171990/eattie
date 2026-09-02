-- ============================================================================
-- 000054: cancel_auto_order() — cancel orders whose payment_deadline has passed
--
-- Digunakan oleh cronjob Hermes (setiap 5 menit) untuk membatalkan order
-- yang belum dibayar setelah payment_deadline lewat.
--
-- Idempotent: CREATE OR REPLACE. Aman dijalankan berulang.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_auto_order()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Cancel orders that:
  --   - are NEW or PAID (not already cancelled/completed/in-production)
  --   - have payment_deadline in the past
  UPDATE public.orders
  SET status = 'CANCELLED',
      updated_at = now()
  WHERE id IN (
    SELECT id FROM public.orders
    WHERE status IN ('NEW', 'PAID')
      AND payment_deadline IS NOT NULL
      AND payment_deadline < now()
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_count', v_count,
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_auto_order() TO anon, authenticated;
