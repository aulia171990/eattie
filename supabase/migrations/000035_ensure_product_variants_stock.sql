-- ============================================================================
-- 000035: Add product_variants.stock + backfill from legacy variant_stock
-- ============================================================================
-- PROD BUG: process_sale() (deployed via 000032) writes product_variants.stock,
-- but the column was never created on live (000023 never executed). Every POS
-- sale with a variant_id throws "column stock does not exist".
--
-- FIX:
--   - Add the missing column (INTEGER NOT NULL DEFAULT 0, matching LANGKAH 2).
--   - Backfill real stock from legacy `variant_stock` (32 rows of real data)
--     so we DON'T zero out existing inventory during the cutover.
--   - Idempotent: backfill runs ONLY when the column is first created, so
--     re-running after real sales won't reset stock that already dropped.
--   - NOTIFY pgrst reloads the PostgREST schema cache (no restart needed).
--
-- NOTE: `decrement_variant_stock()` is already deployed by 000032, so it is
-- NOT redefined here. If process_sale still errors with "function ... does
-- not exist", also run 000029 / 000032.
--
-- Run 000035_precheck.sql FIRST (LANGKAH 1) to confirm variant_stock is
-- still relevant, then this file, then 000035_verify.sql (LANGKAH 3).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'product_variants'
      AND column_name  = 'stock'
  ) THEN
    -- LANGKAH 2a: add the missing column (spec: INTEGER NOT NULL DEFAULT 0)
    ALTER TABLE public.product_variants
      ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;

    -- LANGKAH 2b: backfill from legacy variant_stock (only rows that have data)
    UPDATE public.product_variants pv
    SET stock = vs.current_stock
    FROM public.variant_stock vs
    WHERE vs.variant_id = pv.id;
  END IF;
END $$;

-- LANGKAH 2c: refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Informational summary
SELECT count(*)                                    AS variants_total,
       count(*) FILTER (WHERE stock <> 0)           AS variants_with_stock
FROM public.product_variants;
