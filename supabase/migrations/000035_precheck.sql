-- ============================================================================
-- 000035 PRE-CHECK (LANGKAH 1) — READ ONLY, jalankan SEBELUM 000035
-- ============================================================================
-- Tujuannya: pastikan data di legacy variant_stock masih relevan (bukan data
-- uji coba usang) sebelum kita migrasikan ke product_variants.stock.
-- File ini TIDAK mengubah apa pun — hanya menampilkan data.

-- 1a. Data lama + kapan terakhir di-update
SELECT vs.variant_id, vs.current_stock, vs.min_stock, vs.updated_at, pv.name
FROM variant_stock vs
JOIN product_variants pv ON pv.id = vs.variant_id
ORDER BY vs.updated_at DESC;

-- 1c. Variant di product_variants yang TIDAK punya baris di variant_stock
--     (variant baru, belum pernah di-restock -> nanti default stock = 0, wajar)
SELECT pv.id, pv.name, pv.product_id
FROM product_variants pv
LEFT JOIN variant_stock vs ON vs.variant_id = pv.id
WHERE vs.variant_id IS NULL
ORDER BY pv.name;
