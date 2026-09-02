-- ============================================================
-- VERIFIKASI KONVERSI SATUAN (jalankan di Supabase SQL Editor)
-- ============================================================
-- Skrip ini membuktikan bahwa complete_production_batch() sekarang
-- mengonversi unit resep -> base_unit bahan sebelum memotong stok
-- dan menghitung HPP. Berjalan di dalam transaksi yang di-ROLLBACK,
-- jadi TIDAK mengubah data produksi Anda.
--
-- Skenario:
--   Bahan "Tepung"  base_unit = 'kg',  price_per_unit = 10.000 (per kg)
--   Resep           butuh 500 g tepung per batch (yield 1)
--   Produksi 1 batch -> harus potong 0.5 kg, bukan 500 kg.
--   HPP yang benar  = 0.5 kg * 10.000 = 5.000.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_ing   uuid;
  v_prod  uuid;
  v_rec   uuid;
  v_batch uuid;
  v_res   jsonb;
  v_stock_after numeric;
  v_cost  numeric;
BEGIN
  -- 1. Bahan uji
  INSERT INTO ingredients (name, base_unit, price_per_unit, current_stock)
  VALUES ('__TEST_Tepung', 'kg', 10000, 10)
  RETURNING id INTO v_ing;

  -- 2. Produk uji
  INSERT INTO products (name, category, selling_price)
  VALUES ('__TEST_Roti', 'bread', 0)
  RETURNING id INTO v_prod;

  -- 3. Resep: 500 g tepung, yield 1
  INSERT INTO recipes (product_id, yield_quantity)
  VALUES (v_prod, 1)
  RETURNING id INTO v_rec;

  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  VALUES (v_rec, v_ing, 500, 'g');   -- resep pakai gram!

  -- 4. Batch uji (status planned)
  INSERT INTO production_batches (batch_number, product_id, recipe_id, quantity_planned, status)
  VALUES ('__TEST-1', v_prod, v_rec, 1, 'planned')
  RETURNING id INTO v_batch;

  -- 5. Jalankan RPC produksi
  SELECT public.complete_production_batch(v_batch, 1, 0) INTO v_res;

  -- 6. Cek hasil
  SELECT current_stock INTO v_stock_after FROM ingredients WHERE id = v_ing;
  v_cost := (v_res->>'cost_per_unit')::numeric;

  RAISE NOTICE 'cost_per_unit (HPP) = %  (harus 5000)', v_cost;
  RAISE NOTICE 'stok tepung sisa    = % kg (harus 9.5)', v_stock_after;

  -- 7. Assertions
  IF v_stock_after <> 9.5 THEN
    RAISE EXCEPTION 'GAGAL: stok harus 9.5 kg, dapat %', v_stock_after;
  END IF;
  IF v_cost <> 5000 THEN
    RAISE EXCEPTION 'GAGAL: HPP harus 5000, dapat %', v_cost;
  END IF;

  RAISE NOTICE 'VERIFIKASI BERHASIL: konversi g->kg jalan, stok & HPP benar.';
END $$;

ROLLBACK;
-- Catatan: setelah ROLLBACK semua baris __TEST_* ikut hilang. Tidak ada
-- sampah data yang tertinggal.
