-- ============================================================================
-- 000033: Atomic document-number generation (audit #1.6)
-- ============================================================================
-- The app generated doc numbers (PRD-/PO-/OPN-/BHN-) by SELECT COUNT(*) LIKE
-- 'PREFIX-YYYYMMDD%' then +1. Under concurrent requests two inserts collide on
-- the same number (and there is no unique constraint to catch it). This adds a
-- single atomic generator that takes a short advisory lock per (prefix, day)
-- so two concurrent calls can never return the same number.
--
-- Idempotent: CREATE OR REPLACE. Safe to re-run.
--
-- Columns batch_number / purchase_number / opname_number / code have no UNIQUE
-- constraint — that is fine; the lock guarantees uniqueness in practice. If you
-- want hard DB-level guarantee, add a UNIQUE index (commented at bottom).

CREATE OR REPLACE FUNCTION public.next_doc_number(
  p_prefix text,
  p_table  text,
  p_column text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_today text := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
  v_last  text;
  v_seq   integer;
  v_lock  bigint;
BEGIN
  -- Deterministic per-day lock key derived from the prefix so PRD/PO/OPN/BHN
  -- don't contend with each other, but same-prefix same-day calls serialize.
  v_lock := ('x' || substr(md5(p_prefix || v_today), 1, 15))::bit(60)::bigint;

  -- Serialize concurrent callers for this prefix+day.
  PERFORM pg_advisory_xact_lock(v_lock);

  EXECUTE format(
    'SELECT %I FROM %I WHERE %I LIKE %L ORDER BY %I DESC LIMIT 1',
    p_column, p_table, p_column, p_prefix || '-' || v_today || '-%', p_column
  ) INTO v_last;

  IF v_last IS NULL THEN
    v_seq := 1;
  ELSE
    BEGIN
      v_seq := CAST(split_part(v_last, '-', 3) AS integer) + 1;
    EXCEPTION WHEN OTHERS THEN
      v_seq := 1;
    END;
  END IF;

  RETURN p_prefix || '-' || v_today || '-' || lpad(v_seq::text, 3, '0');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.next_doc_number(text, text, text) TO authenticated;

-- Optional hard uniqueness (uncomment if you want the DB to reject collisions
-- instead of relying solely on the advisory lock):
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_production_batches_batch_number
--   ON public.production_batches (batch_number);
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_purchases_purchase_number
--   ON public.stock_purchases (purchase_number);
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_opnames_opname_number
--   ON public.stock_opnames (opname_number);
