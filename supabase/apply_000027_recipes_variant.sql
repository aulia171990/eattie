-- ============================================================
-- APPLY: Recipe → Product Variant support (resolver fix)
-- ============================================================
-- Cara pakai: copy SELURUH isi file ini ke Supabase SQL Editor,
-- lalu klik "Run". Aman dijalankan berulang (idempoten).
--
-- Tujuannya:
--   1. Pastikan kolom recipes.variant_id ada (sudah ada di migrasi lama,
--      jadi blok ini jadi no-op).
--   2. Tambah unique index agar tidak ada resep dobel per produk/varian.
--   3. Ganti RPC get_recipe_id_for_product menjadi resolver 2-level
--      (varian spesifik dulu, fallback ke resep generik produk).
--   4. HILANGKAN overload fungsi lama (PGRST203) dengan DROP dulu.

-- 1. Tambah kolom variant_id (idempoten)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recipes'
      AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.recipes
      ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Index lookup varian
CREATE INDEX IF NOT EXISTS recipes_variant_id_idx ON public.recipes (variant_id);

-- 3. Unique: satu resep per slot (produk, varian)
CREATE UNIQUE INDEX IF NOT EXISTS recipes_product_generic_uniq
  ON public.recipes (product_id)
  WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recipes_product_variant_uniq
  ON public.recipes (product_id, variant_id)
  WHERE variant_id IS NOT NULL;

-- 4. Hapus overload lama, lalu buat RPC 2-level
DROP FUNCTION IF EXISTS public.get_recipe_id_for_product(UUID);

CREATE OR REPLACE FUNCTION public.get_recipe_id_for_product(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL
)
 RETURNS UUID
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_recipe_id UUID;
BEGIN
  -- Level 1: resep spesifik varian (hanya bila varian diberikan)
  IF p_variant_id IS NOT NULL THEN
    SELECT id INTO v_recipe_id
      FROM public.recipes
        WHERE variant_id = p_variant_id
        LIMIT 1;
  END IF;

  -- Level 0: fallback ke resep generik produk
  IF v_recipe_id IS NULL THEN
    SELECT id INTO v_recipe_id
      FROM public.recipes
        WHERE product_id = p_product_id
          AND variant_id IS NULL
        LIMIT 1;
  END IF;

  RETURN v_recipe_id;
END;
$function$;

-- ============================================================
-- VERIFIKASI (jalankan terpisah, opsional)
-- ============================================================
-- Resep varian spesifik (ganti UUID dengan punyamu):
-- SELECT get_recipe_id_for_product(
--   '3124136d-9ac6-476f-a0bb-0d5c4d1b4f66',
--   '69f18a10-0e33-404b-b522-a4cd9b33abfd'
-- );  -- harus balik 92be852c-...
--
-- Cek tidak ada lagi overload (harus 1 baris):
-- SELECT pronargs, pg_get_function_arguments(oid)
--   FROM pg_proc WHERE proname = 'get_recipe_id_for_product';
