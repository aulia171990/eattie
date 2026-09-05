-- Jalankan satu per satu di Supabase SQL Editor
-- Atau jalankan semua sekaligus (Supabase support multi-statement)

-- Step 1: Nonaktifkan trigger
ALTER TABLE public.store_settings DISABLE TRIGGER ALL;

-- Step 2: Tambah kolom id_uuid
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- Step 3: Isi id_uuid
UPDATE public.store_settings SET id_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid WHERE id_uuid IS NULL;

-- Step 4: Drop PK lama
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;

-- Step 5: Buat PK baru
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id_uuid);

-- Step 6: Drop kolom id lama
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS id;

-- Step 7: Rename
ALTER TABLE public.store_settings RENAME COLUMN id_uuid TO id;

-- Step 8: Add CHECK constraint
ALTER TABLE public.store_settings ADD CONSTRAINT single_row_store_settings CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);

-- Step 9: Aktifkan trigger kembali
ALTER TABLE public.store_settings ENABLE TRIGGER ALL;

-- Verifikasi
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'id';