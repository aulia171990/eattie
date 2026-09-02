-- ============================================================================
-- 000045: Drop legacy variant_stock + its public view (audit E.2)
-- After 000043 (process_sale now uses product_variants.stock) no RPC or app
-- code references variant_stock. It held 32 rows that have already been
-- superseded by product_variants.stock. The variant_stock_public view only
-- projected in_stock from variant_stock, also now obsolete.
-- Idempotent.
-- ============================================================================
DROP VIEW IF EXISTS public.variant_stock_public;
DROP TABLE IF EXISTS public.variant_stock;
