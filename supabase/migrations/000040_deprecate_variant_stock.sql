-- ============================================================================
-- 000036: Deprecate legacy variant_stock (LANGKAH 5 — SOFT, reversible)
-- ============================================================================
-- After 000035 added product_variants.stock and backfilled it from the legacy
-- variant_stock table, the legacy table is now an ORPHAN:
--   - No app code (actions/*, components/*) reads or writes `variant_stock`.
--   - All live RPCs (process_sale / complete_production_batch / decrement_variant_stock
--     from 000029/000032) read & write ONLY product_variants.stock.
--   - Its only references in the repo are comments in 000020/000024/000029 and
--     the 000035 backfill/verify scripts.
--
-- Per the task: DO NOT drop in the same step as the migration. This file only
-- RENAMES the table to _deprecated_variant_stock so the backup is preserved and
-- clearly marked, but no data is destroyed. The real DROP is intentionally
-- commented out at the bottom and must be run ONLY after the new stock column
-- has been verified stable across several real POS transactions.
--
-- Idempotent: re-running is a no-op (the rename guard checks existence).
-- ============================================================================

-- Verify the legacy table still exists before renaming.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'variant_stock'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_deprecated_variant_stock'
  ) THEN
    ALTER TABLE public.variant_stock
      RENAME TO _deprecated_variant_stock;

    COMMENT ON TABLE public._deprecated_variant_stock IS
      'DEPRECATED 2026-08: stock moved to product_variants.stock (migration 000035). Kept as historical backup only. Do NOT use in app code or RPCs. Drop only after product_variants.stock is verified stable in production.';
  END IF;
END $$;

-- Summary: show what remains.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('variant_stock', '_deprecated_variant_stock')
ORDER BY table_name;

-- ============================================================================
-- LANGKAH 5 (lanjutan) — PERMANENT DROP — RUN ONLY WHEN FULLY CONFIDENT
-- ============================================================================
-- Pre-conditions before uncommenting & running the DROP below:
--   1. 000035 applied; process_sale() succeeds on variant sales (no "column
--      does not exist").
--   2. product_variants.stock correctly decrements/increments across many real
--      POS sales and production batches.
--   3. A separate DB backup exists (or you accept losing the 32 legacy rows).
--
-- The foreign key from this table to product_variants is dropped first so the
-- DROP TABLE is clean. This is IRREVERSIBLE — uncomment at your own risk.
--
-- ALTER TABLE public._deprecated_variant_stock
--   DROP CONSTRAINT IF EXISTS variant_stock_variant_id_fkey;
-- DROP TABLE IF EXISTS public._deprecated_variant_stock;
