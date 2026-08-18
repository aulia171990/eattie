-- ============================================================
-- RLS + Indexes for Product Configurator (additive)
-- ============================================================

-- 1. Partial indexes for the active-filtered hot paths
CREATE INDEX IF NOT EXISTS idx_variants_active
  ON public.product_variants (product_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_addons_active
  ON public.product_addons (product_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_option_values_active
  ON public.product_option_values (group_id) WHERE is_active = true;

-- 2. FK lookup indexes (join/verify paths in checkout + POS)
CREATE INDEX IF NOT EXISTS idx_sale_items_variant
  ON public.sale_items (variant_id) WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_product
  ON public.order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product
  ON public.sale_items (product_id) WHERE product_id IS NOT NULL;

-- 3. Bestseller aggregation path (order_items -> orders)
CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON public.order_items (order_id);

-- 4. product_reviews storefront read path (featured, newest first)
CREATE INDEX IF NOT EXISTS product_reviews_featured_idx
  ON public.product_reviews (is_featured, created_at DESC);
