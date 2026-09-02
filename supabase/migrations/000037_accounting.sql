-- ============================================
-- Phase 4: ACCOUNTING LAYER
-- Chart of Accounts + Double-Entry Journal
-- ============================================

-- 1. Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,       -- e.g. '1000', '4000', '5100'
  name TEXT NOT NULL,              -- e.g. 'Kas', 'Penjualan'
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Journal Entries (header)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE, -- auto-generated: JE-YYYYMMDD-NNN
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('sale', 'purchase', 'expense', 'adjustment', 'opening')),
  source_id UUID,                    -- FK to sales/expenses/etc
  total_debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_posted BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (total_debit = total_credit)
);

-- 3. Journal Lines (detail — double entry)
CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit DECIMAL(14,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(14,2) DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (debit > 0 OR credit > 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);

-- RLS
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- Policies: owner sees all, others no access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coa_owner_all') THEN
    CREATE POLICY coa_owner_all ON chart_of_accounts FOR ALL USING (get_user_role() = 'owner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'je_owner_all') THEN
    CREATE POLICY je_owner_all ON journal_entries FOR ALL USING (get_user_role() = 'owner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jl_owner_all') THEN
    CREATE POLICY jl_owner_all ON journal_lines FOR ALL USING (get_user_role() = 'owner');
  END IF;
END $$;

-- ============================================
-- Seed: Chart of Accounts for Bakery ERP
-- ============================================
INSERT INTO chart_of_accounts (code, name, type) VALUES
  -- ASSETS (1xxx)
  ('1000', 'Kas', 'asset'),
  ('1100', 'Bank', 'asset'),
  ('1200', 'Piutang Usaha', 'asset'),
  ('1300', 'Persediaan Bahan Baku', 'asset'),
  ('1400', 'Persediaan Produk Jadi', 'asset'),
  ('1500', 'Perlengkapan', 'asset'),
  ('1600', 'Peralatan', 'asset'),
  -- LIABILITIES (2xxx)
  ('2000', 'Hutang Usaha', 'liability'),
  ('2100', 'Hutang Bank', 'liability'),
  ('2200', 'PPN Keluaran', 'liability'),
  ('2300', 'Gaji Belum Dibayar', 'liability'),
  -- EQUITY (3xxx)
  ('3000', 'Modal', 'equity'),
  ('3100', 'Laba Ditahan', 'equity'),
  ('3200', 'Laba Bulan Berjalan', 'equity'),
  -- REVENUE (4xxx)
  ('4000', 'Penjualan', 'revenue'),
  ('4100', 'Penjualan Online', 'revenue'),
  ('4200', 'Pendapatan Lain', 'revenue'),
  -- EXPENSES (5xxx)
  ('5000', 'Harga Pokok Penjualan (COGS)', 'expense'),
  ('5100', 'Bahan Baku', 'expense'),
  ('5200', 'Gaji & Upah', 'expense'),
  ('5300', 'Sewa', 'expense'),
  ('5400', 'Listrik & Air', 'expense'),
  ('5500', 'Perlengkapan Kantor', 'expense'),
  ('5600', 'Peralatan', 'expense'),
  ('5700', 'Pengeluaran Lain', 'expense')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Auto-journal trigger: Sale completed
-- ============================================
CREATE OR REPLACE FUNCTION fn_journalize_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_total_cogs DECIMAL(14,2) := 0;
  v_line RECORD;
BEGIN
  -- Only journalize when status changes to 'completed'
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Generate entry number
  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (
    'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(
      (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)::text, 3, '0'
    ),
    CURRENT_DATE,
    'Penjualan ' || NEW.invoice_number,
    'sale',
    NEW.id,
    NEW.cashier_id
  ) RETURNING id INTO v_entry_id;

  -- Debit: Kas/Bank (1000/1100), Credit: Penjualan (4000)
  -- Cash sale → debit Cash (1000)
  IF NEW.payment_method IN ('cash', 'qris') THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, NEW.total, 0, 'Kas masuk dari ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1000';
  ELSE
    -- Transfer/card → debit Bank (1100)
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, NEW.total, 0, 'Bank masuk dari ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1100';
  END IF;

  -- Credit: Penjualan (4000)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.total, 'Pendapatan dari ' || NEW.invoice_number
  FROM chart_of_accounts WHERE code = '4000';

  -- COGS: sum from product_inventory cost basis
  FOR v_line IN
    SELECT si.product_id, si.quantity, COALESCE(pi.unit_cost, 0) as unit_cost
    FROM sale_items si
    LEFT JOIN product_inventory pi ON pi.product_id = si.product_id AND pi.batch_id = si.batch_id
    WHERE si.sale_id = NEW.id
  LOOP
    IF v_line.unit_cost > 0 THEN
      v_total_cogs := v_total_cogs + (v_line.quantity * v_line.unit_cost);
    END IF;
  END LOOP;

  IF v_total_cogs > 0 THEN
    -- Debit: COGS (5000), Credit: Persediaan Produk (1400)
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_cogs, 0, 'COGS ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '5000';

    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_cogs, 'Persediaan keluar ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1400';
  END IF;

  -- Update totals
  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  -- Update COGS + gross_profit on sale
  UPDATE sales SET cogs = v_total_cogs, gross_profit = NEW.total - v_total_cogs WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger
DROP TRIGGER IF EXISTS trg_journalize_sale ON sales;
CREATE TRIGGER trg_journalize_sale AFTER UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_journalize_sale();

-- ============================================
-- Auto-journal trigger: Expense approved
-- ============================================
CREATE OR REPLACE FUNCTION fn_journalize_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_account_code TEXT;
BEGIN
  -- Only journalize on approval (status change to 'approved')
  IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Map expense category → account code
  v_account_code := CASE NEW.category
    WHEN 'ingredients' THEN '5100'
    WHEN 'salary' THEN '5200'
    WHEN 'rent' THEN '5300'
    WHEN 'utilities' THEN '5400'
    WHEN 'equipment' THEN '5600'
    ELSE '5700'
  END;

  -- Generate entry number
  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (
    'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(
      (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)::text, 3, '0'
    ),
    NEW.expense_date,
    'Pengeluaran: ' || NEW.description,
    'expense',
    NEW.id,
    NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- Debit: Expense account (5xxx)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.amount, 0, 'Pengeluaran: ' || NEW.description
  FROM chart_of_accounts WHERE code = v_account_code;

  -- Credit: Kas (1000)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.amount, 'Kas keluar: ' || NEW.description
  FROM chart_of_accounts WHERE code = '1000';

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_journalize_expense ON expenses;
CREATE TRIGGER trg_journalize_expense AFTER UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION fn_journalize_expense();

-- ============================================
-- Auto-journal trigger: Purchase received
-- ============================================
CREATE OR REPLACE FUNCTION fn_journalize_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Only journalize when approved_by is set (received + approved)
  IF NEW.approved_by IS NULL OR OLD.approved_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (
    'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(
      (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)::text, 3, '0'
    ),
    CURRENT_DATE,
    'Pembelian ' || NEW.purchase_number,
    'purchase',
    NEW.id,
    NEW.approved_by
  ) RETURNING id INTO v_entry_id;

  -- Debit: Persediaan Bahan Baku (1300)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.total_amount, 0, 'Persediaan masuk dari ' || NEW.purchase_number
  FROM chart_of_accounts WHERE code = '1300';

  -- Credit: Hutang Usaha (2000) — assuming credit purchase
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.total_amount, 'Hutang pembelian ' || NEW.purchase_number
  FROM chart_of_accounts WHERE code = '2000';

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_journalize_purchase ON stock_purchases;
CREATE TRIGGER trg_journalize_purchase AFTER UPDATE ON stock_purchases
  FOR EACH ROW EXECUTE FUNCTION fn_journalize_purchase();
