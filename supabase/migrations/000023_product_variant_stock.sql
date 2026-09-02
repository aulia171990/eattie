-- ============================================================
-- Product Variant Stock
-- ============================================================
-- Configurable products are sold by variant (SKU), but there was
-- no per-variant stock tracking: product_variants had no stock
-- column and no variant_stock table existed. This adds stock at
-- the variant level so each SKU can track availability.
--
-- NOTE: Sale-time stock deduction must be wired into process_sale()
-- (per-variant), which lives in live Supabase and is NOT defined in
-- this repo. Until that RPC is updated, stock is tracked/edited
-- manually (e.g. via opname / production) but not auto-decremented
-- on sale. See audit notes.
-- ============================================================

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0
    CHECK (stock >= 0);

-- Helpful index for "out of stock" filtering on the hot path.
CREATE INDEX IF NOT EXISTS idx_product_variants_stock
  ON public.product_variants (product_id, stock);
