-- Migration 000036: store_settings.id dari BIGINT ke UUID
-- Menggunakan DISABLE TRIGGER USER (hanya trigger buatan user, bukan system)
-- Jalankan di Supabase SQL Editor

-- Step 1: Nonaktifkan trigger buatan user (handle_audit_log dll)
ALTER TABLE public.store_settings DISABLE TRIGGER USER;

-- Step 2: Tambah kolom id_uuid sebagai UUID
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- Step 3: Isi id_uuid dengan UUID stabil
UPDATE public.store_settings SET id_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid WHERE id_uuid IS NULL;

-- Step 4: Drop primary key lama
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;

-- Step 5: Buat primary key baru di id_uuid
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id_uuid);

-- Step 6: Drop kolom id lama (BIGINT)
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS id;

-- Step 7: Rename id_uuid ke id
ALTER TABLE public.store_settings RENAME COLUMN id_uuid TO id;

-- Step 8: Tambah constraint CHECK untuk single-row
ALTER TABLE public.store_settings ADD CONSTRAINT single_row_store_settings CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);

-- Step 9: Aktifkan kembali trigger user
ALTER TABLE public.store_settings ENABLE TRIGGER USER;

-- Verifikasi
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'id';