-- ============================================================================
-- 000068: Custom Cake Request Number — DB-level sequence for uniqueness
-- ============================================================================
-- Current implementation uses Math.random() in JS with retry loop (10x).
-- This works but relies on client-side randomness.
-- Better: DB-level sequence via next_doc_number() or a dedicated sequence.
-- ============================================================================

-- Option A: Use existing next_doc_number() with 'CC' prefix
-- This is already available and safe for concurrent access.

-- Option B: Add unique constraint enforcement at DB level (already exists)
-- The UNIQUE constraint on req_number guarantees no duplicates even if
-- the JS generator somehow collides.

-- The current implementation in actions/custom-cakes.ts is actually safe:
-- 1. UNIQUE constraint on custom_cake_requests.req_number
-- 2. Loop up to 10 attempts with random candidate
-- 3. Check error.code === '23505' (unique violation) for retry
-- 4. Non-unique errors return immediately

-- No migration needed for this — the logic is sound.
-- If you want to use DB-level generation instead, create a wrapper RPC:

CREATE OR REPLACE FUNCTION public.generate_cc_request_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number TEXT;
BEGIN
  -- Generate using next_doc_number for consistency
  v_number := next_doc_number('CC', 'custom_cake_requests', 'req_number');
  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_cc_request_number() TO authenticated;
