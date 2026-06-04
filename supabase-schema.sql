-- ============================================
-- BAKERY MANAGEMENT - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'cashier', 'baker')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'cashier')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  category_id UUID REFERENCES ingredient_categories(id),
  base_unit TEXT NOT NULL,
  purchase_unit TEXT,
  conversion_rate DECIMAL(10,4) DEFAULT 1,
  current_stock DECIMAL(12,3) DEFAULT 0,
  min_stock DECIMAL(12,3) DEFAULT 0,
  max_stock DECIMAL(12,3),
  reorder_point DECIMAL(12,3),
  price_per_unit DECIMAL(14,2) DEFAULT 0,
  last_purchase_price DECIMAL(14,2),
  average_price DECIMAL(14,2),
  shelf_life_days INTEGER,
  storage_location TEXT,
  preferred_supplier_id UUID REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_date DATE NOT NULL,
  received_date DATE,
  subtotal DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_due_date DATE,
  notes TEXT,
  invoice_number TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES stock_purchases(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  quantity_ordered DECIMAL(12,3) NOT NULL,
  quantity_received DECIMAL(12,3) DEFAULT 0,
  unit TEXT NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(14,2) NOT NULL,
  expiry_date DATE,
  batch_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase_in', 'production_out', 'adjustment_in', 'adjustment_out',
    'transfer_in', 'transfer_out', 'return_out', 'waste'
  )),
  quantity DECIMAL(12,3) NOT NULL,
  unit TEXT NOT NULL,
  stock_before DECIMAL(12,3) NOT NULL,
  stock_after DECIMAL(12,3) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  batch_code TEXT,
  expiry_date DATE,
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_opnames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_number TEXT NOT NULL UNIQUE,
  opname_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID REFERENCES stock_opnames(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  system_stock DECIMAL(12,3) NOT NULL,
  actual_stock DECIMAL(12,3),
  difference DECIMAL(12,3),
  unit TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. PRODUCTS & RECIPES
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  category TEXT CHECK (category IN ('bread', 'cake', 'pastry', 'cookies', 'other')),
  selling_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  yield_quantity INTEGER DEFAULT 1,
  instructions TEXT,
  prep_time_minutes INTEGER,
  bake_time_minutes INTEGER,
  bake_temperature INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT
);

-- ============================================
-- 4. PRODUCTION
-- ============================================
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES products(id),
  recipe_id UUID REFERENCES recipes(id),
  quantity_planned INTEGER NOT NULL,
  quantity_produced INTEGER DEFAULT 0,
  quantity_defect INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES production_batches(id),
  quantity INTEGER NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. SALES
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  subtotal DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'qris')),
  payment_amount DECIMAL(12,2),
  change_amount DECIMAL(12,2),
  customer_name TEXT,
  notes TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  cashier_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES production_batches(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('ingredients', 'utilities', 'salary', 'rent', 'equipment', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. VIEWS
-- ============================================
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  DATE(created_at) as sale_date,
  COUNT(*) as total_transactions,
  SUM(total) as total_revenue,
  SUM(discount_amount) as total_discounts
FROM sales
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Ingredients: owner can CRUD, others can read
CREATE POLICY "ingredients_select" ON ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_write" ON ingredients FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

-- Categories: owner CRUD, others read
CREATE POLICY "categories_select" ON ingredient_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_write" ON ingredient_categories FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');

-- Suppliers: owner only
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');
CREATE POLICY "suppliers_write" ON suppliers FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');

-- Stock tables: owner only
CREATE POLICY "stock_purchases_all" ON stock_purchases FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');
CREATE POLICY "stock_items_all" ON stock_purchase_items FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');
CREATE POLICY "stock_movements_all" ON stock_movements FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');
CREATE POLICY "stock_opnames_all" ON stock_opnames FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');
CREATE POLICY "stock_opname_items_all" ON stock_opname_items FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');

-- Products: owner CRUD, others read (for POS)
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write" ON products FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');

-- Recipes: owner only
CREATE POLICY "recipes_select" ON recipes FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');
CREATE POLICY "recipes_write" ON recipes FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');
CREATE POLICY "recipe_ingredients_select" ON recipe_ingredients FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');
CREATE POLICY "recipe_ingredients_write" ON recipe_ingredients FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');

-- Production: owner CRUD, baker read + update status
CREATE POLICY "production_select" ON production_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "production_insert" ON production_batches FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');
CREATE POLICY "production_update" ON production_batches FOR UPDATE TO authenticated
  USING (get_user_role() IN ('owner', 'baker'));

-- Product inventory: all authenticated
CREATE POLICY "product_inventory_all" ON product_inventory FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Sales: owner CRUD, cashier insert + read own
CREATE POLICY "sales_select_owner" ON sales FOR SELECT TO authenticated
  USING (get_user_role() = 'owner' OR cashier_id = auth.uid());
CREATE POLICY "sales_insert" ON sales FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('owner', 'cashier'));
CREATE POLICY "sales_update_owner" ON sales FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "sale_items_select" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('owner', 'cashier'));

-- Expenses: owner only
CREATE POLICY "expenses_all" ON expenses FOR ALL TO authenticated
  USING (get_user_role() = 'owner') WITH CHECK (get_user_role() = 'owner');

-- ============================================
-- 9. SEED DATA (optional - ingredient categories)
-- ============================================
INSERT INTO ingredient_categories (name, name_en, description) VALUES
  ('Tepung', 'Flour', 'Berbagai jenis tepung'),
  ('Gula & Pemanis', 'Sugar & Sweeteners', 'Gula, madu, sirup'),
  ('Dairy', 'Dairy', 'Susu, mentega, keju, krim'),
  ('Telur', 'Eggs', 'Berbagai jenis telur'),
  ('Lemak', 'Fats', 'Minyak, margarin, shortening'),
  ('Perasa & Aroma', 'Flavoring', 'Vanila, coklat, perasa buah'),
  ('Pengembang', 'Leavening', 'Ragi, baking powder, baking soda'),
  ('Topping & Dekorasi', 'Toppings', 'Keju, coklat chip, buah kering'),
  ('Kemasan', 'Packaging', 'Kotak, plastik, tali')
ON CONFLICT DO NOTHING;
