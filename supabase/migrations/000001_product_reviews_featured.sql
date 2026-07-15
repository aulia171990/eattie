-- ============================================================================
--  product_reviews: featured flag + RLS
-- ============================================================================
-- Enable admins to curate which customer reviews show on the public store
-- landing page. Tightens RLS so anonymous visitors can only READ reviews
-- explicitly marked is_featured = true.
--
-- NOTE: product_reviews already exists in the live DB (created out-of-band).
-- This migration is idempotent: ADD COLUMN IF NOT EXISTS + CREATE POLICY IF
-- NOT EXISTS. Run in Supabase SQL Editor on the live project.
-- ============================================================================

-- 1. Add curation flag (nullable default false so existing rows stay hidden
--    until an admin opts them in).
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- 2. Index for the public read path.
CREATE INDEX IF NOT EXISTS product_reviews_featured_idx
  ON public.product_reviews (is_featured, created_at DESC);

-- 3. RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anonymous / any visitor: read ONLY featured reviews.
DROP POLICY IF EXISTS "product_reviews_public_read_featured" ON public.product_reviews;
CREATE POLICY "product_reviews_public_read_featured"
  ON public.product_reviews FOR SELECT TO public
  USING (is_featured = true);

-- Authenticated staff: full read.
DROP POLICY IF EXISTS "product_reviews_staff_read" ON public.product_reviews;
CREATE POLICY "product_reviews_staff_read"
  ON public.product_reviews FOR SELECT TO authenticated
  USING (true);

-- Authenticated staff: toggle curation.
DROP POLICY IF EXISTS "product_reviews_staff_update" ON public.product_reviews;
CREATE POLICY "product_reviews_staff_update"
  ON public.product_reviews FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Authenticated staff: insert (covers storefront review submission).
DROP POLICY IF EXISTS "product_reviews_staff_insert" ON public.product_reviews;
CREATE POLICY "product_reviews_staff_insert"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (true);
