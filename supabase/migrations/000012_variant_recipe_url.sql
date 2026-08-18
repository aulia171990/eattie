-- ============================================================
-- Variant Recipe URL (additive)
-- ============================================================
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS recipe_url TEXT;