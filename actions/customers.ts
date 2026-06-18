-- ============================================================
-- CRM: CUSTOMERS TABLE + AUTO-SYNC + TIER SYSTEM
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. ADD customer_phone TO sales (for reliable matching) ───
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON sales(customer_phone);

-- ── 2. CUSTOMERS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL UNIQUE,
  email            TEXT,
  address          TEXT,
  notes            TEXT,                 -- owner's manual notes (preferences, birthday, etc)
  tier             TEXT NOT NULL DEFAULT 'Bronze'
                     CHECK (tier IN ('Bronze','Silver','Gold','Platinum')),
  total_spending   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders     INTEGER NOT NULL DEFAULT 0,
  last_order_date  TIMESTAMPTZ,
  is_manual        BOOLEAN NOT NULL DEFAULT false,  -- true if owner created manually (not yet ordered)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
CREATE INDEX IF NOT EXISTS idx_customers_total_spending ON customers(total_spending DESC);

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Only owner can view/manage the CRM
DROP POLICY IF EXISTS "customers_owner_all" ON customers;
CREATE POLICY "customers_owner_all" ON customers
  FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

-- ── 4. TIER CALCULATION FUNCTION ─────────────────────────────
-- Bronze: < 500k, Silver: 500k-1.5jt, Gold: 1.5jt-5jt, Platinum: 5jt+
CREATE OR REPLACE FUNCTION calculate_customer_tier(p_total_spending NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_total_spending >= 5000000 THEN RETURN 'Platinum';
  ELSIF p_total_spending >= 1500000 THEN RETURN 'Gold';
  ELSIF p_total_spending >= 500000 THEN RETURN 'Silver';
  ELSE RETURN 'Bronze';
  END IF;
END;
$$;

-- ── 5. UPSERT CUSTOMER FROM ORDER/SALE (called by trigger) ───
CREATE OR REPLACE FUNCTION upsert_customer_from_transaction(
  p_name   TEXT,
  p_phone  TEXT,
  p_amount NUMERIC,
  p_order_date TIMESTAMPTZ
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_total NUMERIC;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN; -- can't track without phone number
  END IF;

  INSERT INTO customers (name, phone, total_spending, total_orders, last_order_date, tier)
  VALUES (
    p_name, p_phone, p_amount, 1, p_order_date,
    calculate_customer_tier(p_amount)
  )
  ON CONFLICT (phone) DO UPDATE SET
    name            = EXCLUDED.name,  -- keep most recent name used
    total_spending  = customers.total_spending + p_amount,
    total_orders    = customers.total_orders + 1,
    last_order_date = GREATEST(customers.last_order_date, EXCLUDED.last_order_date),
    is_manual       = false,          -- has now ordered, no longer manual-only
    updated_at      = now()
  RETURNING total_spending INTO v_new_total;

  -- Recalculate tier based on new total (separate update to use the function)
  UPDATE customers
  SET tier = calculate_customer_tier(total_spending)
  WHERE phone = p_phone;
END;
$$;

-- ── 6. TRIGGER: orders → customers (on COMPLETED via confirm) ─
-- Fires when a sale_id is set on an order (meaning payment confirmed)
CREATE OR REPLACE FUNCTION trg_sync_customer_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.sale_id IS NOT NULL AND OLD.sale_id IS NULL THEN
    PERFORM upsert_customer_from_transaction(
      NEW.customer_name,
      NEW.customer_phone,
      NEW.total_amount,
      NEW.confirmed_at
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_customer ON orders;
CREATE TRIGGER trg_orders_sync_customer
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_sync_customer_from_order();

-- ── 7. TRIGGER: sales → customers (for direct POS sales) ─────
CREATE OR REPLACE FUNCTION trg_sync_customer_from_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.customer_name IS NOT NULL AND NEW.customer_phone IS NOT NULL THEN
    PERFORM upsert_customer_from_transaction(
      NEW.customer_name,
      NEW.customer_phone,
      NEW.total,
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_sync_customer ON sales;
CREATE TRIGGER trg_sales_sync_customer
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION trg_sync_customer_from_sale();

-- ── 8. BACKFILL: populate customers from existing data ───────
-- Run once to import historical orders/sales into the CRM
DO $$
DECLARE
  v_order RECORD;
  v_sale  RECORD;
BEGIN
  -- From completed orders with a sale_id
  FOR v_order IN
    SELECT customer_name, customer_phone, total_amount, confirmed_at, created_at
    FROM orders
    WHERE sale_id IS NOT NULL
      AND customer_phone IS NOT NULL
      AND trim(customer_phone) != ''
    ORDER BY created_at
  LOOP
    PERFORM upsert_customer_from_transaction(
      v_order.customer_name,
      v_order.customer_phone,
      v_order.total_amount,
      COALESCE(v_order.confirmed_at, v_order.created_at)
    );
  END LOOP;

  -- From POS sales that have customer_phone (likely none yet, but safe to run)
  FOR v_sale IN
    SELECT customer_name, customer_phone, total, created_at
    FROM sales
    WHERE customer_phone IS NOT NULL
      AND trim(customer_phone) != ''
    ORDER BY created_at
  LOOP
    PERFORM upsert_customer_from_transaction(
      v_sale.customer_name,
      v_sale.customer_phone,
      v_sale.total,
      v_sale.created_at
    );
  END LOOP;
END;
$$;

-- ── 9. updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_customer_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_touch ON customers;
CREATE TRIGGER trg_customers_touch
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION touch_customer_updated_at();

-- ── 10. RELOAD SCHEMA ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
