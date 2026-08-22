-- ============================================================
-- Add image_url column to product_variants table
-- ============================================================
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS image_url TEXT;