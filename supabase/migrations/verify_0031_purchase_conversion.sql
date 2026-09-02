-- ============================================================
-- VERIFIKASI KONVERSI SATUAN BELI (jalankan di Supabase SQL Editor)
-- ============================================================
-- Membuktikan process_purchase() mengonversi purchase_unit -> base_unit:
--   Bahan "Gula"  base_unit='kg', purchase_unit='karung', conversion_rate=10
--                (1 karung = 10 kg), harga beli 1 karung = Rp50.000
--   Beli 1 karung -> stok +10 kg, harga per kg = 50.000/10 = 5.000
--
-- Berjalan di transaksi ROLLBACK, tidak mengubah data produksi.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_sup   uuid;
  v_ing   uuid;
  v_po    uuid;
  v_item  uuid;
  v_res   jsonb;
  v_stock numeric;
  v_ppu   numeric;
BEGIN
  INSERT INTO suppliers (name) VALUES ('__TEST_Supplier') RETURNING id INTO v_sup;
  INSERT INTO ingredients (name, base_unit, purchase_unit, conversion_rate, price_per_unit, current_stock)
  VALUES ('__TEST_Gula', 'kg', 'karung', 10, 99999, 0)
  RETURNING id INTO v_ing;

  INSERT INTO stock_purchases (purchase_number, supplier_id, status, subtotal, total_amount, created_by)
  VALUES ('__TEST-PO', v_sup, 'ordered', 50000, 50000, (SELECT id FROM profiles LIMIT 1))
  RETURNING id INTO v_po;

  INSERT INTO stock_purchase_items (purchase_id, ingredient_id, quantity_ordered, quantity_received, unit, unit_price, subtotal)
  VALUES (v_po, v_ing, 1, 1, 'karung', 50000, 50000)
  RETURNING id INTO v_item;

  SELECT public.process_purchase(v_po) INTO v_res;

  SELECT current_stock, price_per_unit INTO v_stock, v_ppu FROM ingredients WHERE id = v_ing;

  RAISE NOTICE 'stok gula  = % kg (harus 10)', v_stock;
  RAISE NOTICE 'harga/kg   = % (harus 5000)', v_ppu;

  IF v_stock <> 10 THEN RAISE EXCEPTION 'GAGAL: stok harus 10 kg, dapat %', v_stock; END IF;
  IF v_ppu   <> 5000 THEN RAISE EXCEPTION 'GAGAL: harga/kg harus 5000, dapat %', v_ppu; END IF;

  RAISE NOTICE 'VERIFIKASI BERHASIL: 1 karung -> 10 kg, harga/kg = 5000.';
END $$;

ROLLBACK;
