-- 000035_store_settings_color_presets.sql
-- Menambahkan kolom jsonb color_presets ke tabel store_settings agar owner
-- bisa menyimpan beberapa palet rekomendasi warna favoritnya (per toko).

-- 1) Tambah kolom (idempoten)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings'
      AND column_name = 'color_presets'
  ) THEN
    ALTER TABLE store_settings
      ADD COLUMN color_presets jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 2) Pastikan bentuknya selalu array jsonb (jaga-jaga data lama null/object).
UPDATE store_settings
  SET color_presets = '[]'::jsonb
  WHERE color_presets IS NULL
     OR jsonb_typeof(color_presets) <> 'array';

-- 3) Validasi ringan di level DB: tiap elemen array minimal punya nama + primary_color.
--    Tidak memblokir update lainnya, hanya menolak payload preset cacat.
ALTER TABLE store_settings
  DROP CONSTRAINT IF EXISTS color_presets_shape;

ALTER TABLE store_settings
  ADD CONSTRAINT color_presets_shape
  CHECK (
    color_presets IS NOT NULL
    AND jsonb_typeof(color_presets) = 'array'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(color_presets) AS el
      WHERE el ? 'name' IS FALSE
         OR (el ->> 'name') IS NULL
         OR (el ->> 'name') = ''
         OR el ? 'colors' IS FALSE
         OR jsonb_typeof(el -> 'colors') <> 'object'
    )
  );
