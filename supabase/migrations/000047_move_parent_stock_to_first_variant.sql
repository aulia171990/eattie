-- ============================================================================
-- 000047: Move parent product.current_stock into the FIRST variant's stock.
-- Audit finding (POS bug): for variant products (Burnt Cheese, cheese cake,
-- Donut) stock was entered on products.current_stock (parent) while all
-- product_variants.stock = 0. process_sale checks product_variants.stock when a
-- variant_id is sent, so sales failed with "Stok varian ... tidak cukup" even
-- though stock existed at the parent level.
-- Fix: move parent stock into the first variant (ORDER BY created_at, id), then
-- zero out the parent so stock is not double-counted. Idempotent: only moves
-- when the first variant still has stock = 0 and parent has stock > 0.
-- Trial data only; safe to run.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  first_var_id uuid;
BEGIN
  FOR r IN
    SELECT p.id AS pid, p.current_stock
    FROM products p
    WHERE p.current_stock > 0
      AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id)
      AND NOT EXISTS (
        SELECT 1 FROM product_variants pv2
        WHERE pv2.product_id = p.id AND pv2.stock > 0
      )
  LOOP
    -- pick first variant deterministically
    SELECT pv.id INTO first_var_id
    FROM product_variants pv
    WHERE pv.product_id = r.pid
    ORDER BY pv.created_at, pv.id
    LIMIT 1;

    IF first_var_id IS NOT NULL THEN
      UPDATE product_variants
      SET stock = r.current_stock
      WHERE id = first_var_id;

      UPDATE products
      SET current_stock = 0
      WHERE id = r.pid;
    END IF;
  END LOOP;
END $$;
