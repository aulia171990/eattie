-- ============================================================
-- Recipe → Product Variant support (2-level resolution)
-- ============================================================
-- A recipe can now be bound to a SPECIFIC variant (e.g. "Roti Coklat"
-- vs "Roti Keju") or left generic (variant_id IS NULL) to apply to the
-- whole product. Production resolves: variant-specific recipe first,
-- then falls back to the product's generic recipe.
--
-- Idempotent: safe to re-run if the column already exists.

-- 1. Add variant_id column (nullable) if missing
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

-- 2. Index to speed up variant-specific lookups
CREATE INDEX IF NOT EXISTS recipes_variant_id_idx ON public.recipes (variant_id);

-- 3. Unique constraint: one recipe per (product, variant) "slot".
--    Generic recipes (variant_id NULL) are coalesced to a fixed sentinel
--    UUID so multiple generic rows for DIFFERENT products don't collide,
--    while two generic rows for the SAME product are still rejected.
--    NOTE: Postgres treats NULLs as distinct in a unique index, so we use
--    a partial unique index for generics and a plain unique index for
--    variant-bound recipes separately.
CREATE UNIQUE INDEX IF NOT EXISTS recipes_product_generic_uniq
  ON public.recipes (product_id)
  WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recipes_product_variant_uniq
  ON public.recipes (product_id, variant_id)
  WHERE variant_id IS NOT NULL;

-- 4. Replace resolution RPC with 2-level logic.
--    NOTE: CREATE OR REPLACE cannot change the parameter list, so the old
--    1-arg version would remain as an overload and break PostgREST (PGRST203).
--    Drop the old signature first, then create the new 2-arg version.
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
  -- Level 1: variant-specific recipe (only when a variant is supplied)
  IF p_variant_id IS NOT NULL THEN
    SELECT id INTO v_recipe_id
      FROM public.recipes
        WHERE variant_id = p_variant_id
        LIMIT 1;
  END IF;

  -- Level 0: fallback to the product's generic recipe
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
