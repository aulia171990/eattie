# Langkah Manual: Jalankan Migration 000036

Migration ini mengubah `store_settings.id` dari BIGINT ke UUID.

## Cara menjalankan

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project **eattie** (`zyolnitnvmzfttvwjyle`)
3. Menu **SQL Editor** → **New Query**
4. Copy-paste isi file ini:

```sql
-- Nonaktifkan semua trigger di store_settings
ALTER TABLE public.store_settings DISABLE TRIGGER ALL;

-- Tambah kolom id_uuid sebagai UUID
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS id_uuid UUID;

-- Isi id_uuid dengan UUID stabil untuk single-row
UPDATE public.store_settings
SET id_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
WHERE id_uuid IS NULL;

-- Drop primary key lama
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;

-- Set id_uuid sebagai primary key baru
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id_uuid);

-- Drop kolom id lama (BIGINT)
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS id;

-- Rename id_uuid jadi id
ALTER TABLE public.store_settings RENAME COLUMN id_uuid TO id;

-- Tambah constraint CHECK untuk single-row
ALTER TABLE public.store_settings ADD CONSTRAINT single_row_store_settings
  CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);

-- Aktifkan kembali trigger
ALTER TABLE public.store_settings ENABLE TRIGGER ALL;

-- Verifikasi
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'store_settings' AND column_name = 'id';
```

5. Klik **Run** / **Execute**

## Verifikasi

Setelah dijalankan, cek:
- Kolom `id` di `store_settings` harus bertipe `uuid`
- Coba update sidebar_color di dashboard → tidak boleherror

## Jika ada error

Jika muncul error tentang trigger yang memicu, pastikan trigger `handle_audit_log` sudah di-disable sebelum menjalankan migration. File migrasi sudah termasuk perintah `DISABLE TRIGGER ALL` dan `ENABLE TRIGGER ALL`.

## Setelah migration

File `supabase/schema.sql` sudah diperbarui untuk mencerminkan perubahan ini. Tidak perlu langkah tambahan.
