-- ============================================================================
-- 000034: Ensure sale_items carries variant + addon data (audit #1.1)
-- ============================================================================
-- The variant-aware POS writes sale_items.variant_id + addon_detail so that
-- process_sale() (000029) can deduct product_variants.stock and the sale line
-- stays traceable. Those columns were introduced by 000020, but may not be
-- present on the live table (the generated types/database.ts still reflects an
-- older schema with variant_name/variant_price/addons). This migration makes
-- the columns exist idempotently so the audit #1.1 fix in actions/sales.ts
-- actually persists. Safe to re-run.
--
-- NOTE: if your live sale_items already uses the OLD columns
-- (variant_name/variant_price/addons) instead of variant_id/addon_detail,
-- regenerate types/database.ts from the DB after applying all migrations.

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);

CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id
  ON public.sale_items (variant_id);

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS addon_detail JSONB;

NOTIFY pgrst, 'reload schema';
