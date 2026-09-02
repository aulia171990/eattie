-- ============================================================================
-- 000042: Drop orphan variant-recipe system (duplicate of recipes + RPC
--         get_recipe_id_for_product). Confirmed: 0 rows in variant_recipes and
--         variant_recipe_ingredients; 0 references in app code / repo SQL.
-- The live DB had TWO parallel recipe systems — this removes the unused one.
-- CASCADE also drops the child table variant_recipe_ingredients (FK-dependent).
-- NOTE: variant_stock / variant_stock_public are intentionally left untouched
--       (see audit E.2 — archive decision pending).
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_variant_recipe_id(uuid);
DROP FUNCTION IF EXISTS public.complete_variant_production_batch(uuid, integer, integer);
DROP TABLE IF EXISTS public.variant_recipes CASCADE;
