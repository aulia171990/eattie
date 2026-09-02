-- ============================================
-- Phase 6A: Accounts Receivable & Payable
-- + Aging buckets + Payment tracking
-- ============================================

-- 1. Accounts Receivable (Piutang)
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  source TEXT NOT NULL CHECK (source IN ('sale', 'order')),
  source_id UUID,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Accounts Payable (Hutang)
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  source TEXT NOT NULL CHECK (source IN ('purchase')),
  source_id UUID,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Payment Records (track partial/full payments for both AR & AP)
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_ap_type TEXT NOT NULL CHECK (ar_ap_type IN ('receivable', 'payable')),
  ar_ap_id UUID NOT NULL,
  amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'card', 'qris')),
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ar_status ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_ar_due ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_ap_due ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_pr_arap ON payment_records(ar_ap_type, ar_ap_id);

-- RLS
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ar_owner_all') THEN
    CREATE POLICY ar_owner_all ON accounts_receivable FOR ALL USING (get_user_role() = 'owner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ap_owner_all') THEN
    CREATE POLICY ap_owner_all ON accounts_payable FOR ALL USING (get_user_role() = 'owner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pr_owner_all') THEN
    CREATE POLICY pr_owner_all ON payment_records FOR ALL USING (get_user_role() = 'owner');
  END IF;
END $$;

-- Auto-update status to overdue when due_date passes
CREATE OR REPLACE FUNCTION fn_update_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accounts_receivable SET status = 'overdue'
  WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE;

  UPDATE accounts_payable SET status = 'overdue'
  WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Run daily via pg_cron or manual trigger
-- For now, fire on any insert/update to refresh statuses
DROP TRIGGER IF EXISTS trg_refresh_overdue ON accounts_receivable;
CREATE TRIGGER trg_refresh_overdue AFTER INSERT OR UPDATE ON accounts_receivable
  FOR EACH STATEMENT EXECUTE FUNCTION fn_update_overdue_status();
