-- Migration 000036: store_settings.id dari BIGINT ke UUID
-- Drop trigger dulu → migrasi → recreate trigger

-- Step 1: Drop trigger trg_audit_store_settings
DROP TRIGGER IF EXISTS trg_audit_store_settings ON public.store_settings;

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

-- Step 9: Recreate trigger untuk audit
CREATE TRIGGER trg_audit_store_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- Verifikasi
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'id';