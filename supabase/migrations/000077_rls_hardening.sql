-- ============================================================================
-- 000077: RLS hardening — enable RLS + policies for critical tables
-- ============================================================================
-- Many tables lack RLS, meaning anyone with the anon key could potentially
-- read/write them directly via the Supabase REST API, bypassing server actions.
--
-- This migration enables RLS and creates policies for:
--   - Public read: products (storefront needs to display them)
--   - Authenticated read: orders, sales, inventory, production, etc.
--   - Owner write: all sensitive tables
-- ============================================================================

-- ── Products (public read for storefront, owner write) ──────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "products_authenticated_read" ON public.products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "products_owner_write" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Orders (authenticated read, owner/cashier write) ───────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_authenticated_read" ON public.orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "orders_owner_cashier_write" ON public.orders
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'cashier') AND is_active = true
  ));

-- ── Order items (authenticated read, owner/cashier write) ──────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_authenticated_read" ON public.order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "order_items_owner_cashier_write" ON public.order_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'cashier') AND is_active = true
  ));

-- ── Sales (authenticated read, owner/cashier write) ────────────────────────
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_authenticated_read" ON public.sales
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sales_owner_cashier_write" ON public.sales
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'cashier') AND is_active = true
  ));

-- ── Sale items (authenticated read, owner/cashier write) ───────────────────
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_items_authenticated_read" ON public.sale_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sale_items_owner_cashier_write" ON public.sale_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'cashier') AND is_active = true
  ));

-- ── Ingredients (authenticated read, owner write) ──────────────────────────
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredients_authenticated_read" ON public.ingredients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ingredients_owner_write" ON public.ingredients
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Recipes (authenticated read, owner write) ──────────────────────────────
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_authenticated_read" ON public.recipes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "recipes_owner_write" ON public.recipes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Recipe ingredients (authenticated read, owner write) ───────────────────
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ingredients_authenticated_read" ON public.recipe_ingredients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "recipe_ingredients_owner_write" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Production batches (authenticated read, owner/baker write) ─────────────
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_batches_authenticated_read" ON public.production_batches
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "production_batches_owner_baker_write" ON public.production_batches
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'baker') AND is_active = true
  ));

-- ── Inventory movements (authenticated read, owner write) ──────────────────
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_authenticated_read" ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "inventory_movements_owner_write" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Stock movements (authenticated read, owner write) ─────────────────────
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_authenticated_read" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "stock_movements_owner_write" ON public.stock_movements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Stock purchases (authenticated read, owner write) ─────────────────────
ALTER TABLE public.stock_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_purchases_authenticated_read" ON public.stock_purchases
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "stock_purchases_owner_write" ON public.stock_purchases
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Stock purchase items (authenticated read, owner write) ────────────────
ALTER TABLE public.stock_purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_purchase_items_authenticated_read" ON public.stock_purchase_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "stock_purchase_items_owner_write" ON public.stock_purchase_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Stock opnames (authenticated read, owner write) ───────────────────────
ALTER TABLE public.stock_opnames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_opnames_authenticated_read" ON public.stock_opnames
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "stock_opnames_owner_write" ON public.stock_opnames
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Stock opname items (authenticated read, owner write) ──────────────────
ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_opname_items_authenticated_read" ON public.stock_opname_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "stock_opname_items_owner_write" ON public.stock_opname_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Expenses (authenticated read, owner write) ────────────────────────────
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_authenticated_read" ON public.expenses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "expenses_owner_write" ON public.expenses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Suppliers (authenticated read, owner write) ───────────────────────────
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_authenticated_read" ON public.suppliers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "suppliers_owner_write" ON public.suppliers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Custom cake requests (authenticated read, owner write) ─────────────────
ALTER TABLE public.custom_cake_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_cake_requests_authenticated_read" ON public.custom_cake_requests
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "custom_cake_requests_owner_write" ON public.custom_cake_requests
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Custom cakes (authenticated read, owner write) ────────────────────────
ALTER TABLE public.custom_cakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_cakes_authenticated_read" ON public.custom_cakes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "custom_cakes_owner_write" ON public.custom_cakes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Customer orders (authenticated read, owner write) ─────────────────────
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_orders_authenticated_read" ON public.customer_orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "customer_orders_owner_write" ON public.customer_orders
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Customer order items (authenticated read, owner write) ────────────────
ALTER TABLE public.customer_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_order_items_authenticated_read" ON public.customer_order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "customer_order_items_owner_write" ON public.customer_order_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Loyalty transactions (authenticated read, owner write) ────────────────
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_transactions_authenticated_read" ON public.loyalty_transactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "loyalty_transactions_owner_write" ON public.loyalty_transactions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Product inventory (authenticated read, owner write) ───────────────────
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_inventory_authenticated_read" ON public.product_inventory
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "product_inventory_owner_write" ON public.product_inventory
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Order status logs (authenticated read, owner write) ───────────────────
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_logs_authenticated_read" ON public.order_status_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "order_status_logs_owner_write" ON public.order_status_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Order valid transitions (authenticated read, owner write) ─────────────
ALTER TABLE public.order_valid_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_valid_transitions_authenticated_read" ON public.order_valid_transitions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "order_valid_transitions_owner_write" ON public.order_valid_transitions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));

-- ── Ingredient categories (authenticated read, owner write) ────────────────
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredient_categories_authenticated_read" ON public.ingredient_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ingredient_categories_owner_write" ON public.ingredient_categories
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND is_active = true
  ));
