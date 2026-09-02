-- Migration: 000060_add_update_production_batch_status_rpc.sql
-- RPC untuk update status production batch (non-completed transitions)
-- Validasi status transisi di database, bukan di application layer

CREATE OR REPLACE FUNCTION update_production_batch_status(
  p_batch_id UUID,
  p_new_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch RECORD;
BEGIN
  -- 1. Lookup batch dengan FOR UPDATE (lock prevent race condition)
  SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch tidak ditemukan');
  END IF;

  -- 2. Guard: batch sudah completed → tidak boleh di-update
  IF v_batch.status = 'completed' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Batch sudah selesai, tidak bisa di-update');
  END IF;

  -- 3. Guard: batch sudah cancelled → tidak boleh di-update (kecuali cancel ulang? tidak perlu)
  IF v_batch.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Batch sudah dibatalkan, tidak bisa di-update');
  END IF;

  -- 4. Validasi transisi yang diizinkan
  IF p_new_status = 'in_progress' THEN
    IF v_batch.status != 'planned' THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Hanya batch dengan status planned yang bisa dimulai produksi');
    END IF;
    -- Update: set started_at
    UPDATE production_batches
    SET status = 'in_progress',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = p_batch_id;
    RETURN jsonb_build_object('success', true, 'status', 'in_progress');

  ELSIF p_new_status = 'completed' THEN
    -- Transisi ke completed harus pakai RPC complete_production_batch
    -- (yang menangani stock deduction, cost accounting, dll)
    -- Jangan lolos di sini — paksa caller panggil complete_production_batch
    RETURN jsonb_build_object('success', false,
      'error', 'Transisi ke completed harus melalui complete_production_batch() RPC');

  ELSIF p_new_status = 'cancelled' THEN
    -- Cancel boleh dari planned atau in_progress
    IF v_batch.status NOT IN ('planned', 'in_progress') THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Hanya batch planned atau in_progress yang bisa dibatalkan');
    END IF;
    UPDATE production_batches
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_batch_id;
    RETURN jsonb_build_object('success', true, 'status', 'cancelled');

  ELSE
    RETURN jsonb_build_object('success', false,
      'error', format('Status tidak valid: %s', p_new_status));
  END IF;
END;
$$;

-- Grant execute to public (atau role yang sesuai)
GRANT EXECUTE ON FUNCTION update_production_batch_status(UUID, TEXT) TO anon, authenticated, service_role;
