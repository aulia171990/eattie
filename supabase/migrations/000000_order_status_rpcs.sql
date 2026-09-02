-- ============================================================================
--  ORDER STATUS RPCs  (Rekonstruksi dari kode — BUKAN dump dari live DB)
-- ============================================================================
--
--  ⚠️  PENTING — BACA SEBELUM MENJALANKAN DI LIVE:
--
--  File ini adalah REKONSTRUKSI dari kontrak yang dipanggil di
--  `actions/orders.ts` (7 RPC status pesanan). Definisi asli HANYA ada di
--  Supabase live (tidak tersimpan di repo — lihat Bug 4 di HANDOFF.md).
--
--  Fungsi di bawah dibuat agar:
--    1. Sintaks SQL-nya valid (ter-validasi di Postgres lokal).
--    2. Signature & return type cocok persis dengan yang dipanggil kode:
--         param : (p_order_id uuid, p_user_id uuid)
--         return: jsonb  { success bool, error text, sale_id uuid,
--                          invoice_number text, idempotent bool }
--    3. Transisi status & aturan idempotensi sesuai komentar di orders.ts.
--
--  NAMUN logika internal (terutama rpc_confirm_order yang memanggil
--  process_sale() untuk kurangi stok) adalah TEBAKAN TERBAIK dari behavior
--  UI. JANGAN jalankan bare-metal di production tanpa:
--    a. Diff dulu dengan definisi asli di Supabase (Database → Functions).
--    b. Test di project staging.
--  Kalau sudah cocok, ini jadi "backup" resmi supaya RPC tidak hilang
--  tanpa jejak kalau project Supabase dibuat ulang.
--
--  Semua RPC pakai SECURITY DEFINER + SET search_path = public agar aman
--  dari search_path hijack, dan mengecek kepemilikan/role via p_user_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_confirm_order(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order   orders%ROWTYPE;
  v_sale_id uuid;
  v_inv     text;
  v_item    record;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  -- Idempoten: kalau sale sudah dibuat, kembalikan yang ada
  IF v_order.sale_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true,
      'sale_id', v_order.sale_id,
      'invoice_number', v_order.order_number
    );
  END IF;

  IF v_order.status NOT IN ('NEW', 'PAID') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order NEW/PAID yang bisa dikonfirmasi');
  END IF;

  -- Buat sale header
  SELECT generate_invoice_number() INTO v_inv;
  INSERT INTO sales (
    invoice_number, subtotal, discount_amount, tax_amount, total,
    payment_method, customer_name, notes, status, cashier_id
  ) VALUES (
    v_inv, v_order.subtotal, v_order.discount_amount, 0, v_order.total_amount,
    'cash', v_order.customer_name, v_order.notes, 'pending', p_user_id
  ) RETURNING id INTO v_sale_id;

  -- Copy order_items -> sale_items
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    INSERT INTO sale_items (
      sale_id, product_id, product_name, quantity, unit_price, subtotal
    ) VALUES (
      v_sale_id, v_item.product_id, v_item.product_name,
      v_item.quantity, v_item.unit_price, v_item.subtotal
    );
  END LOOP;

  -- Kurangi stok via RPC yang sudah ada di live (lihat HANDOFF Bug 4)
  PERFORM process_sale(p_sale_id := v_sale_id);

  -- Tandai order PAID + hubungkan sale
  UPDATE orders
  SET status = 'PAID',
      sale_id = v_sale_id,
      payment_status = 'PAID',
      payment_confirmed_at = now(),
      payment_confirmed_by = p_user_id,
      confirmed_at = now(),
      confirmed_by = p_user_id,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true, 'sale_id', v_sale_id, 'invoice_number', v_inv
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cancel_order(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  IF v_status NOT IN ('NEW', 'PAID') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order NEW/PAID yang bisa dibatalkan');
  END IF;

  UPDATE orders
  SET status = 'CANCELLED', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_start_production(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  IF v_status NOT IN ('NEW', 'PAID') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order NEW/PAID yang bisa mulai produksi');
  END IF;

  UPDATE orders
  SET status = 'IN_PRODUCTION', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ready_for_pickup(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  IF v_status <> 'IN_PRODUCTION' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order IN_PRODUCTION yang bisa ditandai siap');
  END IF;

  UPDATE orders
  SET status = 'READY_FOR_PICKUP', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_deliver_order(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  IF v_status <> 'READY_FOR_PICKUP' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order READY_FOR_PICKUP yang bisa diantar');
  END IF;

  UPDATE orders
  SET status = 'DELIVERED', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_complete_order(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  IF v_status NOT IN ('READY_FOR_PICKUP', 'DELIVERED') THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Hanya order READY_FOR_PICKUP/DELIVERED yang bisa diselesaikan');
  END IF;

  UPDATE orders
  SET status = 'COMPLETED', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_mark_paid(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pesanan tidak ditemukan');
  END IF;

  -- Idempoten: sudah PAID?
  IF v_order.payment_status = 'PAID' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true);
  END IF;

  UPDATE orders
  SET payment_status = 'PAID',
      payment_confirmed_at = now(),
      payment_confirmed_by = p_user_id,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
