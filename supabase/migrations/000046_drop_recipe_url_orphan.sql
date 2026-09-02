-- ============================================================================
-- 000046: Drop orphan column product_variants.recipe_url
-- Audit finding (E.1): recipe_url is a free-text link column that is NOT
-- referenced by any .ts/.tsx app code (grep = 0 matches). The real per-variant
-- recipe system is relational: recipes (variant_id nullable) + recipe_ingredients
-- + RPC get_recipe_id_for_product (2-level resolution). recipe_url is dead.
-- Safe to drop. Idempotent.
-- ============================================================================
ALTER TABLE public.product_variants DROP COLUMN IF EXISTS recipe_url;
