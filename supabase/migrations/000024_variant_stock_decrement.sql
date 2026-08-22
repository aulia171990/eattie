-- ============================================================
-- Variant Stock Decrement Helper
-- ============================================================
-- Part of the Product Configurator variant-stock feature.
-- Migration 000023 added `product_variants.stock`. This file
-- provides a SAFE, atomic helper to decrement a variant's stock
-- (with a row lock + availability check) and the snippet to call
-- it from the live `process_sale()` RPC.
--
-- ⚠️  READ BEFORE RUNNING ON LIVE:
--  1. This file is ADDITIVE and safe to run on its own — it only
--     creates `decrement_variant_stock()`. Nothing else changes.
--  2. Stock deduction on sale does NOT happen until the live
--     `process_sale()` (which is NOT defined in this repo — see
--     000000 header) is edited to call this helper inside its
--     existing transaction. Paste the "MERGE INTO process_sale"
--     snippet (bottom) into that live function, then diff against
--     the original in Supabase before applying.
--  3. Do NOT recreate `process_sale()` from scratch here — its
--     real definition lives only in live Supabase.
--  4. Uses `product_variants.stock`, NOT a `variant_stock` table
--     (that table was referenced in old comments but never existed).
-- ============================================================

CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_variant_id uuid,
  p_qty integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'qty harus positif');
  END IF;

  -- Lock the row so concurrent sales can't both read-then-decrement.
  SELECT stock INTO v_current
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'varian tidak ditemukan');
  END IF;

  IF v_current < p_qty THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'stok varian tidak cukup',
      'available', v_current,
      'requested', p_qty
    );
  END IF;

  UPDATE public.product_variants
  SET stock = stock - p_qty,
      updated_at = now()
  WHERE id = p_variant_id;

  RETURN jsonb_build_object('success', true, 'remaining', v_current - p_qty);
END;
$$;

-- Grant to the roles that call RPC-backed flows (same pattern as
-- the existing order-status RPCs in 000000).
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, integer) TO authenticated;

-- ============================================================
-- MERGE INTO process_sale (live Supabase only)
-- ============================================================
-- Inside the existing process_sale() loop over sale_items, after
-- the row is validated, add roughly:
--
--   IF si.variant_id IS NOT NULL THEN
--     SELECT public.decrement_variant_stock(si.variant_id, si.quantity)
--       INTO v_var_res;
--     IF (v_var_res->>'success') <> 'true' THEN
--       -- abort the sale (raise exception or return error),
--       -- mirroring how ingredient/COGS failures already roll back.
--       RAISE EXCEPTION 'Stok varian tidak cukup: %', v_var_res->>'error';
--     END IF;
--   END IF;
--
-- Replace the old (broken) reference to `variant_stock` with the
-- helper above. Diff against the live definition before applying.
-- ============================================================
