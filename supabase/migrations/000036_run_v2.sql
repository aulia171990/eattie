-- Migration 000036: store_settings.id dari BIGINT ke UUID
-- Tanpa disable/enable trigger (karena privilege terbatas)
-- Jalankan di Supabase SQL Editor

-- Step 1: Tambah kolom id_uuid sebagai UUID
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- Step 2: Isi id_uuid dengan UUID stabil
UPDATE public.store_settings SET id_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid WHERE id_uuid IS NULL;

-- Step 3: Drop primary key lama
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;

-- Step 4: Buat primary key baru di id_uuid
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id_uuid);

-- Step 5: Drop kolom id lama (BIGINT)
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS id;

-- Step 6: Rename id_uuid ke id
ALTER TABLE public.store_settings RENAME COLUMN id_uuid TO id;

-- Step 7: Tambah constraint CHECK untuk single-row
ALTER TABLE public.store_settings ADD CONSTRAINT single_row_store_settings CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);

-- Verifikasi
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'id';