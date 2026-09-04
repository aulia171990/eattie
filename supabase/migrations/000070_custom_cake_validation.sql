-- ============================================================================
-- 000070: Custom Cake — Status Transition Validation + Role Check
-- ============================================================================
-- 1. RPC get_custom_cake_actions(p_request_id) — return valid next statuses
-- 2. RPC update_custom_cake_request_rpc(p_request_id, p_status, p_quoted_price, p_user_id)
--    validates transition + role server-side
-- ============================================================================

-- Get valid next statuses for a custom cake request
CREATE OR REPLACE FUNCTION public.get_custom_cake_actions(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_next_statuses TEXT[] := '{}';
BEGIN
  SELECT id, status
  INTO v_request
  FROM custom_cake_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'valid_next_statuses', '{}'::text[]
    );
  END IF;

  -- Valid transitions
  IF v_request.status = 'pending' THEN
    v_next_statuses := ARRAY['quoted', 'cancelled'];
  ELSIF v_request.status = 'quoted' THEN
    v_next_statuses := ARRAY['confirmed', 'cancelled'];
  ELSIF v_request.status = 'confirmed' THEN
    v_next_statuses := ARRAY['in_production', 'cancelled'];
  ELSIF v_request.status = 'in_production' THEN
    v_next_statuses := ARRAY['ready', 'cancelled'];
  ELSIF v_request.status = 'ready' THEN
    v_next_statuses := ARRAY['delivered'];
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'current_status', v_request.status,
    'valid_next_statuses', v_next_statuses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_custom_cake_actions(UUID) TO authenticated;


-- Update custom cake request with server-side validation
CREATE OR REPLACE FUNCTION public.update_custom_cake_request_rpc(
  p_request_id UUID,
  p_status TEXT DEFAULT NULL,
  p_quoted_price NUMERIC DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_valid_statuses TEXT[] := '{}';
  v_user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role IS NULL OR v_user_role != 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hanya owner yang bisa update custom cake');
  END IF;

  -- Get current request
  SELECT id, status INTO v_request FROM custom_cake_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request tidak ditemukan');
  END IF;

  -- Validate status transition
  IF p_status IS NOT NULL AND p_status != v_request.status THEN
    IF v_request.status = 'pending' THEN
      v_valid_statuses := ARRAY['quoted', 'cancelled'];
    ELSIF v_request.status = 'quoted' THEN
      v_valid_statuses := ARRAY['confirmed', 'cancelled'];
    ELSIF v_request.status = 'confirmed' THEN
      v_valid_statuses := ARRAY['in_production', 'cancelled'];
    ELSIF v_request.status = 'in_production' THEN
      v_valid_statuses := ARRAY['ready', 'cancelled'];
    ELSIF v_request.status = 'ready' THEN
      v_valid_statuses := ARRAY['delivered'];
    END IF;

    IF NOT (p_status = ANY(v_valid_statuses)) THEN
      RETURN jsonb_build_object('success', false, 'error', format('Transisi status tidak valid: %s → %s', v_request.status, p_status));
    END IF;
  END IF;

  -- Validate quoted_price
  IF p_quoted_price IS NOT NULL AND p_quoted_price < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Harga tidak valid');
  END IF;

  -- Perform update
  UPDATE custom_cake_requests SET
    status = COALESCE(p_status, status),
    quoted_price = COALESCE(p_quoted_price, quoted_price),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_custom_cake_request_rpc(UUID, TEXT, NUMERIC, UUID) TO authenticated;
