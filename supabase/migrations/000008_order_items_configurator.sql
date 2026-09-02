-- ============================================================
-- Order Items Additive Migration
-- ============================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS variant_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS addons JSONB;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS variant_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS addons JSONB;
