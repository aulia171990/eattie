-- ============================================================================
-- 000058_preorder_setup.sql
--
-- SETUP PRE-ORDER STORE ONLINE
-- ========================================
--
-- Berisi semua perubahan database untuk fitur pre-order.
-- Digabungkan dari beberapa migration sebelumnya:
--   - 000053: Tambah kolom payment_deadline di orders
--   - 000054: Fungsi cancel_auto_order()
--   - 000056: Fungsi compute_payment_deadline()
--   - 000057: Tambah kolom lead_time_days di products
--
-- Kron job: diatur via Hermes cronjob (job ID: f74f10168adb)
--   Schedule: */5 * * * * (setiap 5 menit)
--   Prompt: SELECT public.cancel_auto_order()
--
-- NOTES:
--   - pg_cron EXTENSION TIDAK tersedia di Supabase project ini.
--     Gunakan Hermes cronjob sebagai gantinya.
--   - Semua fungsi sudah dibuat di live DB dan terverifikasi.
--   - Test berhasil: compute_payment_deadline() dan cancel_auto_order() berjalan.
-- ============================================================================

-- 1. Tambah kolom payment_deadline di orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ;

-- 2. Tambah kolom lead_time_days di products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lead_time_days integer;

COMMENT ON COLUMN public.products.lead_time_days IS
  'Berapa hari yang dibutuhkan untuk memproduksi produk ini. NULL = default 1 hari (besok). Custom cake = 3 hari.';

-- 3. Buat fungsi compute_payment_deadline()
CREATE OR REPLACE FUNCTION public.compute_payment_deadline(
  p_pickup_date timestamptz,
  p_order_type text DEFAULT 'PICKUP'
) RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deadline timestamptz;
BEGIN
  -- Fixed window: 12 jam dari pembuatan order
  v_deadline := now() + interval '12 hours';

  IF p_order_type = 'PICKUP' THEN
    -- Minimal 1 jam sebelum pickup
    v_deadline := LEAST(v_deadline, p_pickup_date - interval '1 hour');
  ELSIF p_order_type = 'DELIVERY' THEN
    -- Minimal 2 jam sebelum jadwal delivery
    v_deadline := LEAST(v_deadline, p_pickup_date - interval '2 hours');
  END IF;

  RETURN v_deadline;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_payment_deadline() TO anon, authenticated;

-- 4. Buat fungsi cancel_auto_order()
CREATE OR REPLACE FUNCTION public.cancel_auto_order()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
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

-- 5. Dokumentasi pengaturan kron job Hermes
--   Job ID: f74f10168adb
--   Schedule: */5 * * * *
--   Prompt: SELECT public.cancel_auto_order()
-- ============================================================================
