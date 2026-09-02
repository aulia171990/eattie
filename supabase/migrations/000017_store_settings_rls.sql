-- Dokumentasi RLS store_settings yang sudah aktif di database.
-- (Dikerjakan langsung di Supabase SQL Editor sebelumnya, sekarang
-- dicatat di sini supaya tidak hilang kalau project pernah rebuild.)
--
-- Terverifikasi via pg_policies pada 2026 — 3 policy sudah benar:
-- - public + authenticated boleh SELECT (branding perlu terbaca semua orang)
-- - hanya owner (lewat subquery ke profiles) yang boleh UPDATE
-- - tidak ada INSERT/DELETE karena baris ini singleton (id = 1)

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_can_read_store_settings" ON public.store_settings;
CREATE POLICY "public_can_read_store_settings"
  ON public.store_settings FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_read_store_settings" ON public.store_settings;
CREATE POLICY "authenticated_can_read_store_settings"
  ON public.store_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "owner_can_update_store_settings" ON public.store_settings;
CREATE POLICY "owner_can_update_store_settings"
  ON public.store_settings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
  ));
