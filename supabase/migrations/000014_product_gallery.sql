-- ============================================================
-- Add variant_id to product_gallery (additive)
-- product_gallery table itself created in 000007.
-- ============================================================
ALTER TABLE public.product_gallery
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_gallery_variant ON public.product_gallery(variant_id);
