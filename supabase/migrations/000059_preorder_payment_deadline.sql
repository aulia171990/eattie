CREATE OR REPLACE FUNCTION public.compute_payment_deadline(
  p_pickup_date timestamptz,
  p_order_type text DEFAULT 'PICKUP'
) RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deadline timestamptz;
BEGIN
  -- Fixed window dasar: 12 jam dari pembuatan order
  v_deadline := now() + interval '12 hours';

  IF p_order_type = 'PICKUP' THEN
    -- Minimal 1 jam sebelum pickup
    v_deadline := LEAST(v_deadline, p_pickup_date - interval '1 hour');
  ELSIF p_order_type = 'DELIVERY' THEN
    -- Minimal 2 jam sebelum jadwal delivery
    v_deadline := LEAST(v_deadline, p_pickup_date - interval '2 hours');
  ELSIF p_order_type = 'PREORDER' THEN
    -- Preorder: berikan waktu pembayaran lebih panjang.
    -- Aturan: LEAST dari (24 jam dari now) atau (1 hari sebelum pickup).
    v_deadline := LEAST(
      now() + interval '24 hours',
      p_pickup_date - interval '1 day'
    );
  END IF;

  RETURN v_deadline;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_payment_deadline() TO anon, authenticated;
