-- ============================================================
-- NORMALISASI price_per_unit (PREVIEW — hanya SELECT, tidak mengubah)
-- ============================================================
-- Untuk bahan yang punya purchase_unit + conversion_rate, harga beli
-- disimpan per purchase_unit (mis. per "karung"). Skrip ini menghitung
-- ulang price_per_unit PER BASE_UNIT dari riwayat pembelian terakhir
-- yang unit-nya sama dengan purchase_unit:
--     price_per_base = unit_price / conversion_rate
--
-- Jalankan ini DULU untuk memeriksa baris yang akan berubah, lalu
-- jalankan file apply_xxxx jika sudah yakin.
-- ============================================================

SELECT
  i.id,
  i.name,
  i.base_unit,
  i.purchase_unit,
  i.conversion_rate,
  i.price_per_unit                              AS harga_lama_per_base,
  spi.unit                                     AS unit_beli_terakhir,
  spi.unit_price                               AS harga_per_purchase_unit,
  ROUND(spi.unit_price / NULLIF(i.conversion_rate, 0), 2)
                                                  AS harga_baru_per_base,
  i.current_stock
FROM ingredients i
CROSS JOIN LATERAL (
  SELECT unit, unit_price
  FROM stock_purchase_items spi
  JOIN stock_purchases sp ON sp.id = spi.purchase_id
  WHERE spi.ingredient_id = i.id
    AND spi.quantity_received > 0
    AND spi.unit = i.purchase_unit          -- hanya yg unit-nya = purchase_unit
  ORDER BY sp.received_date DESC NULLS LAST, spi.created_at DESC
  LIMIT 1
) spi
WHERE i.purchase_unit IS NOT NULL
  AND i.purchase_unit <> ''
  AND i.conversion_rate IS NOT NULL
  AND i.conversion_rate > 0
  -- hindari double-normalisasi: hanya yg harga lamanya masih per purchase_unit
  -- (ciri: harga lama ≈ harga per purchase_unit, jauh lebih besar dari yg seharusnya)
  AND i.price_per_unit > (spi.unit_price / NULLIF(i.conversion_rate, 0))
ORDER BY i.name;
