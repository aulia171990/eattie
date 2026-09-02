-- ============================================================================
-- 000037: Compatibility VIEW `variant_stock` -> product_variants.stock
-- ============================================================================
-- After 000036 renames the legacy table to _deprecated_variant_stock, the name
-- `variant_stock` becomes free. Any ad-hoc / external query that still does
--   SELECT * FROM variant_stock;
-- would otherwise error. This view restores that name as a live read-only
-- mirror of product_variants.stock so nothing breaks, while the real source of
-- truth stays product_variants.stock (maintained by process_sale /
-- complete_production_batch / decrement_variant_stock).
--
-- Column shape matches the legacy table (variant_id, current_stock, min_stock,
-- updated_at) plus `name` for convenience. min_stock is NULL because
-- product_variants has no per-variant min_stock column.
--
-- GUARD: only creates the view if the real table `variant_stock` no longer
-- exists (i.e. 000036 has run). If the table is still present, this is a
-- no-op — run 000036 first.
--
-- Idempotent: CREATE OR REPLACE VIEW so re-running is safe.
-- MUST run AFTER 000036.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'variant_stock'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.variant_stock AS
      SELECT
        pv.id            AS variant_id,
        pv.stock         AS current_stock,
        NULL::integer    AS min_stock,
        pv.updated_at    AS updated_at,
        pv.name          AS name
      FROM public.product_variants pv;
    $view$;

    EXECUTE $comment$
      COMMENT ON VIEW public.variant_stock IS
      'COMPAT VIEW (migration 000037): mirrors product_variants.stock. Read-only. Do not depend on this long-term; use product_variants.stock directly.';
    $comment$;
  END IF;
END $$;
