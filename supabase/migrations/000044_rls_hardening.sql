-- ============================================================================
-- 000044: RLS hardening (audit C.1) + align product_option_groups with goal #6
-- Issue found live: product_option_groups had NO is_active column, so the
-- public-read policy could not filter inactive rows (goal #6 requires
-- "SELECT is_active=true for everyone"). We add is_active (default true, like
-- the sibling tables) then lock the read policy to is_active=true. Also remove
-- anon read on order_items (public could read every store's line items); anon
-- keeps INSERT via the existing order_items_insert policy.
-- sale_items select (authenticated, qual=true) is correct for single-tenant
-- and is intentionally left unchanged.
-- ============================================================================

-- Add is_active to product_option_groups so goal #6 can be enforced.
ALTER TABLE public.product_option_groups
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 1) product_option_groups public read -> is_active=true
DROP POLICY IF EXISTS option_groups_public_read ON public.product_option_groups;
CREATE POLICY option_groups_public_read
  ON public.product_option_groups FOR SELECT
  TO public
  USING (is_active = true);

-- 2) order_items select -> authenticated only (remove anon read)
DROP POLICY IF EXISTS order_items_select ON public.order_items;
CREATE POLICY order_items_select
  ON public.order_items FOR SELECT
  TO authenticated
  USING (true);
