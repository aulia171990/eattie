-- ============================================================================
-- 000048: Allow 'variant' and 'product_variant' in inventory_movements.item_type
-- Audit finding: complete_production_batch inserts item_type='product_variant'
-- and process_sale inserts item_type='variant' for variant stock movements, but
-- the existing CHECK only permitted ('ingredient','product'). Both RPCs then
-- fail with "violates check constraint inventory_movements_item_type_check".
-- Fix: drop the old constraint and recreate it with the full allowed set so
-- variant-level traceability is preserved (item_id still holds the variant uuid).
-- Idempotent: guard each step with IF EXISTS / re-create only if missing.
-- ============================================================================

-- 1. Drop the old 2-value constraint (idempotent)
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_item_type_check;

-- 2. Recreate with the full allowed item_type set
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_item_type_check
  CHECK ((item_type = ANY (ARRAY[
    'ingredient'::text,
    'product'::text,
    'variant'::text,
    'product_variant'::text
  ])));

-- 3. Sanity: show the constraint definition
-- (run separately if needed)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid='inventory_movements'::regclass AND contype='c';
