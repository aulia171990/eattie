-- ============================================================
-- NORMALISASI price_per_unit (APPLY — mengubah data)
-- ============================================================
-- Menormalisasi price_per_unit bahan yg punya purchase_unit menjadi
-- harga PER BASE_UNIT, dihitung dari riwayat beli terakhir:
--     price_per_base = unit_price / conversion_rate
--
-- GUARD: hanya mengubah baris yg harga lamanya masih per purchase_unit
-- (harga lama > harga_per_base). Baris yg sudah benar (sudah per base)
-- tidak disentuh -> aman dijalankan berulang (idempoten).
--
-- Disarankan jalankan normalize_prices_preview.sql dulu untuk cek.
-- ============================================================

WITH last_buy AS (
  SELECT DISTINCT ON (spi.ingredient_id)
    spi.ingredient_id,
    spi.unit_price / NULLIF(i.conversion_rate, 0) AS price_per_base
  FROM stock_purchase_items spi
  JOIN stock_purchases sp ON sp.id = spi.purchase_id
  JOIN ingredients i      ON i.id = spi.ingredient_id
  WHERE spi.quantity_received > 0
    AND spi.unit = i.purchase_unit
    AND i.purchase_unit IS NOT NULL AND i.purchase_unit <> ''
    AND i.conversion_rate IS NOT NULL AND i.conversion_rate > 0
  ORDER BY spi.ingredient_id, sp.received_date DESC NULLS LAST, spi.created_at DESC
)
UPDATE ingredients i
SET
  price_per_unit  = lb.price_per_base,
  average_cost    = lb.price_per_base,
  last_purchase_price = lb.price_per_base,
  updated_at      = now()
FROM last_buy lb
WHERE i.id = lb.ingredient_id
  AND i.price_per_unit > lb.price_per_base;   -- hanya yg masih per purchase_unit

-- (baris di atas yg price_per_unit <= price_per_base = sudah benar, dilewati)
