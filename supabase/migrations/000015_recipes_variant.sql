-- ============================================================
-- Per-variant recipes support (additive)
-- ============================================================

-- Variant recipes: allow a recipe row to target a variant
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_variant ON public.recipes(variant_id);

-- cost_price per variant for HPP tracking
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) NOT NULL DEFAULT 0;
