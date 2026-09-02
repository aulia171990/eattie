-- ============================================================
-- Variant-specific recipes (additive)
-- product_variants.recipe_url already added in 000012.
-- This allows a recipe row to optionally target a specific variant
-- instead of the whole product.
-- ============================================================
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_recipes_variant ON public.recipes(variant_id);
