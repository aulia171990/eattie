-- ============================================================================
-- 000053: Add payment_deadline column to orders table
--
-- Digunakan untuk mekanisme auto-cancel order yang belum dibayar dalam
-- waktu yang ditentukan (hybrid: min(fixed_window, pickup_time - buffer)).
--
-- IDEMPOTENT: ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- ============================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ;