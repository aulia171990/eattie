-- ============================================================================
-- 000065: P2 — Reversal Entry + Stock Opname Journalize
-- ============================================================================
-- P2-1: Stock opname variance journalize
--        Plus (fisik > sistem): Dr Persediaan Bahan Baku (1300), Cr Selisih Stok (5800)
--        Minus (fisik < sistem): Dr Selisih Stok (5800), Cr Persediaan Bahan Baku (1300)
--
-- P2-2: Reversal entry saat sale di-cancel/refund
--        Membalik jurnal penjualan: Dr Penjualan, Cr Kas/Bank, Dr Persediaan, Cr COGS
--
-- P2-3: Reversal entry saat expense di-reject
--        Membalik jurnal expense: Dr Kas, Cr Expense account
-- ============================================================================

-- ── PART 1: Add COA for Stock Variance ─────────────────────────────────────
INSERT INTO chart_of_accounts (code, name, type) VALUES
  ('5800', 'Selisih Stok', 'expense')
ON CONFLICT (code) DO NOTHING;


-- ── PART 2: Update process_stock_opname() — journalize variance ────────────
CREATE OR REPLACE FUNCTION public.process_stock_opname(p_opname_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname    RECORD;
  v_item      RECORD;
  v_diff      NUMERIC;
  v_movtype   TEXT;
  v_new_stock NUMERIC;
  v_adjusted  INTEGER := 0;
  v_entry_id  UUID;
  v_total_plus DECIMAL(14,2) := 0;
  v_total_minus DECIMAL(14,2) := 0;
BEGIN
  SELECT * INTO v_opname
  FROM stock_opnames
  WHERE id = p_opname_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opname % not found', p_opname_id;
  END IF;
  IF v_opname.status = 'completed' THEN
    RAISE EXCEPTION 'Opname % already completed', p_opname_id;
  END IF;

  -- Generate entry number for opname journal
  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (
    'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(
      (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)::text, 3, '0'
    ),
    CURRENT_DATE,
    'Stock Opname ' || v_opname.opname_number,
    'opname',
    p_opname_id,
    COALESCE(v_opname.submitted_by, v_opname.created_by)
  ) RETURNING id INTO v_entry_id;

  FOR v_item IN
    SELECT soi.*, i.current_stock AS live_stock
    FROM stock_opname_items soi
    JOIN ingredients i ON i.id = soi.ingredient_id
    WHERE soi.opname_id = p_opname_id
      AND soi.actual_stock IS NOT NULL
    FOR UPDATE OF i
  LOOP
    -- Apply the difference between counted stock and the LIVE stock at submit time
    v_diff := v_item.actual_stock - v_item.live_stock;

    UPDATE stock_opname_items SET
      difference = (v_item.actual_stock - v_item.system_stock)
    WHERE id = v_item.id;

    IF v_diff = 0 THEN CONTINUE; END IF;

    v_movtype := CASE WHEN v_diff > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END;
    v_new_stock := v_item.live_stock + v_diff;

    UPDATE ingredients SET
      current_stock = v_new_stock,
      updated_at    = now()
    WHERE id = v_item.ingredient_id;

    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id, reason
    ) VALUES (
      'ingredient', v_item.ingredient_id, 'opname_adjustment',
      ABS(v_diff), v_item.unit,
      v_item.live_stock, v_new_stock,
      'opname', p_opname_id,
      COALESCE(v_item.reason, 'Stock opname adjustment')
    );

    INSERT INTO stock_movements (
      ingredient_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id, reason
    ) VALUES (
      v_item.ingredient_id, v_movtype::TEXT,
      ABS(v_diff), v_item.unit,
      v_item.live_stock, v_new_stock,
      'opname', p_opname_id,
      COALESCE(v_item.reason, 'Stock opname adjustment')
    );

    -- Accumulate variance for journal
    IF v_diff > 0 THEN
      v_total_plus := v_total_plus + (ABS(v_diff) * COALESCE(
        (SELECT average_cost FROM ingredients WHERE id = v_item.ingredient_id), 0
      ));
    ELSE
      v_total_minus := v_total_minus + (ABS(v_diff) * COALESCE(
        (SELECT average_cost FROM ingredients WHERE id = v_item.ingredient_id), 0
      ));
    END IF;

    v_adjusted := v_adjusted + 1;
  END LOOP;

  -- Journalize variance
  IF v_total_plus > 0 THEN
    -- Plus: Dr Persediaan Bahan Baku (1300), Cr Selisih Stok (5800)
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_plus, 0, 'Stok opname - selisih plus'
    FROM chart_of_accounts WHERE code = '1300';

    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_plus, 'Stok opname - selisih plus'
    FROM chart_of_accounts WHERE code = '5800';
  END IF;

  IF v_total_minus > 0 THEN
    -- Minus: Dr Selisih Stok (5800), Cr Persediaan Bahan Baku (1300)
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_minus, 0, 'Stok opname - selisih minus'
    FROM chart_of_accounts WHERE code = '5800';

    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_minus, 'Stok opname - selisih minus'
    FROM chart_of_accounts WHERE code = '1300';
  END IF;

  -- Update journal totals
  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  UPDATE stock_opnames SET
    status       = 'completed',
    completed_at = now()
  WHERE id = p_opname_id;

  RETURN jsonb_build_object(
    'success',        true,
    'opname_id',      p_opname_id,
    'items_adjusted', v_adjusted
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;


-- ── PART 3: Reversal entry saat sale di-cancel/refund ──────────────────────
CREATE OR REPLACE FUNCTION public.fn_reverse_sale_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_line RECORD;
BEGIN
  -- Only when status changes from 'completed' to 'cancelled' or 'refunded'
  IF OLD.status != 'completed' OR NEW.status NOT IN ('cancelled', 'refunded') THEN
    RETURN NEW;
  END IF;

  -- Generate reversal entry number
  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (
    'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(
      (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)::text, 3, '0'
    ),
    CURRENT_DATE,
    'REVERSAL Penjualan ' || NEW.invoice_number,
    'reversal',
    NEW.id,
    NEW.cashier_id
  ) RETURNING id INTO v_entry_id;

  -- Reverse the original sale journal:
  -- Original: Dr Cash/Bank, Cr Sales, Dr COGS, Cr Inventory
  -- Reversal: Dr Sales, Cr Cash/Bank, Dr Inventory, Cr COGS

  -- Debit: Penjualan (4000) — reverse revenue
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.total, 0, 'REVERSAL Pendapatan ' || NEW.invoice_number
  FROM chart_of_accounts WHERE code = '4000';

  -- Credit: Kas/Bank — reverse cash receipt
  IF NEW.payment_method IN ('cash', 'qris') THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, NEW.total, 'REVERSAL Kas keluar ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1000';
  ELSE
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, NEW.total, 'REVERSAL Bank keluar ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1100';
  END IF;

  -- Reverse COGS if it was > 0
  IF COALESCE(OLD.cogs, 0) > 0 THEN
    -- Debit: Persediaan Produk (1400) — restore inventory
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, OLD.cogs, 0, 'REVERSAL Persediaan masuk ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1400';

    -- Credit: COGS (5000) — reverse expense
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, OLD.cogs, 'REVERSAL COGS ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '5000';
  END IF;

  -- Update totals
  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_sale_journal ON sales;
CREATE TRIGGER trg_reverse_sale_journal AFTER UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_reverse_sale_journal();


-- ── PART 4: Reversal entry saat expense di-reject ──────────────────────────
CREATE OR REPLACE FUNCTION public.fn_reverse_expense_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_account_code TEXT;
BEGIN
  -- Only when status changes from 'approved' to 'rejected'
  IF OLD.status != 'approved' OR NEW.status != 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Map expense category → account code (same as fn_journalize_expense)
  v_account_code := CASE NEW.category
    WHEN 'ingredients' THEN '5100'
    WHEN 'salary' THEN '5200'
    WHEN 'rent' THEN '5300'
    WHEN 'utilities' THEN '5400'
    WHEN 'equipment' THEN '5600'
    ELSE '5700'
  END;

  -- Generate reversal entry number
  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (
    'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(
      (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)::text, 3, '0'
    ),
    CURRENT_DATE,
    'REVERSAL Pengeluaran: ' || NEW.description,
    'reversal',
    NEW.id,
    NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- Reverse the original expense journal:
  -- Original: Dr Expense (5xxx), Cr Cash (1000)
  -- Reversal: Dr Cash (1000), Cr Expense (5xxx)

  -- Debit: Kas (1000) — restore cash
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.amount, 0, 'REVERSAL Kas masuk: ' || NEW.description
  FROM chart_of_accounts WHERE code = '1000';

  -- Credit: Expense account — reverse expense
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.amount, 'REVERSAL Pengeluaran: ' || NEW.description
  FROM chart_of_accounts WHERE code = v_account_code;

  -- Update totals
  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_expense_journal ON expenses;
CREATE TRIGGER trg_reverse_expense_journal AFTER UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION public.fn_reverse_expense_journal();
