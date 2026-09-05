-- ===========================================================================
-- 000036 Fix: store_settings.id UUID (was BIGINT)
-- ===========================================================================
-- Masalah: store_settings.id adalah BIGINT, tapi audit_logs.record_id adalah UUID.
-- Trigger handle_audit_log() gagal karena NEW.id (bigint) tidak bisa
-- dimasukkan ke record_id (uuid) saat update store_settings.
--
-- Solusi: Ganti store_settings.id dari BIGINT ke UUID untuk konsistensi
-- dengan audit_logs dan semua tabel lainnya.
--
-- Catatan: Migration ini idempoten — aman dijalankan berulang kali.
-- ===========================================================================

-- Langkah 1: Tambah kolom id_uuid sebagai UUID
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- Langkah 2: Isi id_uuid dengan UUID stabil untuk single-row (id=1)
UPDATE public.store_settings
SET id_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE id_uuid IS NULL;

-- Langkah 3: Drop primary key lama (BIGINT) jika ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_settings_pkey'
    AND conrelid = 'public.store_settings'::regclass
  ) THEN
    ALTER TABLE public.store_settings DROP CONSTRAINT store_settings_pkey;
  END IF;
END $$;

-- Langkah 4: Set id_uuid sebagai primary key baru
ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id_uuid);

-- Langkah 5: Drop kolom id yang lama (BIGINT)
ALTER TABLE public.store_settings
  DROP COLUMN IF EXISTS id;

-- Langkah 6: Rename id_uuid jadi id
ALTER TABLE public.store_settings
  RENAME COLUMN id_uuid TO id;

-- Langkah 7: Tambahkan constraint CHECK untuk single-row (UUID)
-- Gunakan UUID yang sama seperti yang diisi di Langkah 2
ALTER TABLE public.store_settings
  ADD CONSTRAINT single_row_store_settings CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Langkah 8: Verifikasi hasil
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'store_settings'
  AND column_name = 'id';

SELECT 'Migration store_settings.id->UUID selesai' AS status;