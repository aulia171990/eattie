-- ===========================================================================
-- 000036 Fix: store_settings.id UUID (was BIGINT) — FINAL
-- ===========================================================================
-- Masalah:
--   store_settings.id bertipe BIGINT, sedangkan audit_logs.record_id bertipe UUID.
--   Saat update store_settings, trigger handle_audit_log() mencoba memasukkan
--   nilai BIGINT ke record_id UUID → error:
--   "column record_id is of type uuid but expression is of type bigint"
--
-- Solusi:
--   Ubah store_settings.id dari BIGINT ke UUID agar konsisten dengan
--   audit_logs dan semua tabel lainnya.
--
-- Pendekatan:
--   1. Nonaktifkan semua trigger di store_settings (mencegah trigger
--      handle_audit_log() memicu error saat UPDATE)
--   2. Tambah kolom id_uuid (UUID)
--   3. Isi id_uuid dengan UUID tetap
--   4. Drop primary key lama, buat primary key baru di id_uuid
--   5. Drop kolom id lama (BIGINT)
--   6. Rename id_uuid → id
--   7. Aktifkan kembali trigger
--
-- Catatan:
--   - Migration ini idempotent (aman di-run berulang)
--   - Jalankan di Supabase SQL Editor
-- ===========================================================================

-- Step 1: Nonaktifkan semua trigger di store_settings
ALTER TABLE public.store_settings DISABLE TRIGGER ALL;

-- Step 2: Tambah kolom id_uuid sebagai UUID
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- Step 3: Isi id_uuid dengan UUID stabil untuk single-row (id=1)
UPDATE public.store_settings
SET id_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
WHERE id_uuid IS NULL;

-- Step 4: Drop primary key lama jika ada
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;

-- Step 5: Set id_uuid sebagai primary key baru
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id_uuid);

-- Step 6: Drop kolom id lama (BIGINT)
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS id;

-- Step 7: Rename id_uuid jadi id
ALTER TABLE public.store_settings RENAME COLUMN id_uuid TO id;

-- Step 8: Tambah constraint CHECK untuk single-row (UUID)
ALTER TABLE public.store_settings ADD CONSTRAINT single_row_store_settings
  CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);

-- Step 9: Aktifkan kembali semua trigger
ALTER TABLE public.store_settings ENABLE TRIGGER ALL;

-- Verifikasi hasil
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_name = 'store_settings'
  AND c.column_name = 'id';

SELECT 'Migration store_settings.id → UUID selesai' AS status;