-- ============================================================
-- Add variant_id + addon_detail to sale_items
-- ============================================================
-- The variant-aware POS feature (actions/sales.ts) already writes
-- variant_id and addon_detail into sale_items, and migration 000009
-- (process_sale) joins variant_stock ON si.variant_id. But the column
-- was only added to production_batches (000006), never to sale_items,
-- so the insert + join fail at runtime and the generated client
-- (types/database.ts) rejects .eq('variant_id', id). This closes that
-- gap so sale_items can reference variants, matching the rest of the
-- variant feature.
-- ============================================================

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);

CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id
  ON public.sale_items(variant_id);

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS addon_detail JSONB;

NOTIFY pgrst, 'reload schema';
