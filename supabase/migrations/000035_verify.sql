-- ============================================================================
-- 000035 VERIFY (LANGKAH 3) — jalankan SETELAH 000035
-- ============================================================================
-- Pastikan pv.stock == vs.current_stock untuk semua baris yang punya data lama.
-- Baris dengan old_stock NULL = variant baru (belum pernah restock) ->
-- stock 0 adalah wajar, bukan kehilangan data.

SELECT pv.id,
       pv.name,
       pv.stock,
       vs.current_stock AS old_stock
FROM product_variants pv
LEFT JOIN variant_stock vs ON vs.variant_id = pv.id
ORDER BY pv.name;

-- Cek cepat: baris mana (jika ada) yang tidak cocok setelah backfill.
-- Hasil harus 0 baris (kecuali variant yang memang tidak punya data lama).
SELECT pv.id, pv.name, pv.stock, vs.current_stock AS old_stock
FROM product_variants pv
JOIN variant_stock vs ON vs.variant_id = pv.id
WHERE pv.stock <> vs.current_stock;
