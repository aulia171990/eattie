-- ============================================================================
-- 000066: P3 — Fix entry_number race condition
-- ============================================================================
-- All journal trigger functions previously used:
--   (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)
-- This is NOT safe for concurrent transactions — two calls can get the same number.
--
-- Fix: Replace with next_doc_number() which uses pg_advisory_xact_lock() for
-- per-day serialization. Prefix 'JE' for journal entries.
-- ============================================================================

-- ── 1. fn_journalize_sale ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_journalize_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_cogs DECIMAL(14,2) := 0;
  v_line RECORD;
  v_unit_cost DECIMAL(14,2);
  v_recipe_cost DECIMAL(14,2);
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Use next_doc_number for safe concurrent entry numbering
  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'Penjualan ' || NEW.invoice_number, 'sale', NEW.id, NEW.cashier_id)
  RETURNING id INTO v_entry_id;

  IF NEW.payment_method IN ('cash', 'qris') THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, NEW.total, 0, 'Kas masuk dari ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1000';
  ELSE
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, NEW.total, 0, 'Bank masuk dari ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1100';
  END IF;

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.total, 'Pendapatan dari ' || NEW.invoice_number
  FROM chart_of_accounts WHERE code = '4000';

  FOR v_line IN
    SELECT si.product_id, si.quantity, si.batch_id
    FROM sale_items si WHERE si.sale_id = NEW.id
  LOOP
    v_unit_cost := 0;
    IF v_line.batch_id IS NOT NULL THEN
      SELECT cost_per_unit INTO v_unit_cost FROM production_batches WHERE id = v_line.batch_id;
    END IF;
    IF v_unit_cost IS NULL OR v_unit_cost <= 0 THEN
      SELECT fn_calculate_recipe_cost(r.id) INTO v_recipe_cost
      FROM recipes r WHERE r.product_id = v_line.product_id LIMIT 1;
      v_unit_cost := COALESCE(v_recipe_cost, 0);
    END IF;
    IF v_unit_cost <= 0 THEN
      SELECT COALESCE(cost_price, 0) INTO v_unit_cost FROM products WHERE id = v_line.product_id;
    END IF;
    IF v_unit_cost > 0 THEN
      v_total_cogs := v_total_cogs + (v_line.quantity * v_unit_cost);
    END IF;
  END LOOP;

  IF v_total_cogs > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_cogs, 0, 'COGS ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '5000';
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_cogs, 'Persediaan keluar ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1400';
  END IF;

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  UPDATE sales SET cogs = v_total_cogs, gross_profit = NEW.total - v_total_cogs WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- ── 2. fn_journalize_expense ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_journalize_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_account_code TEXT;
BEGIN
  IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  v_account_code := CASE NEW.category
    WHEN 'ingredients' THEN '5100'
    WHEN 'salary' THEN '5200'
    WHEN 'rent' THEN '5300'
    WHEN 'utilities' THEN '5400'
    WHEN 'equipment' THEN '5600'
    ELSE '5700'
  END;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, NEW.expense_date, 'Pengeluaran: ' || NEW.description, 'expense', NEW.id, NEW.created_by)
  RETURNING id INTO v_entry_id;

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.amount, 0, 'Pengeluaran: ' || NEW.description
  FROM chart_of_accounts WHERE code = v_account_code;

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.amount, 'Kas keluar: ' || NEW.description
  FROM chart_of_accounts WHERE code = '1000';

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

-- ── 3. fn_journalize_purchase ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_journalize_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  IF NEW.approved_by IS NULL OR OLD.approved_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'Pembelian ' || NEW.purchase_number, 'purchase', NEW.id, NEW.approved_by)
  RETURNING id INTO v_entry_id;

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.total_amount, 0, 'Persediaan masuk dari ' || NEW.purchase_number
  FROM chart_of_accounts WHERE code = '1300';

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.total_amount, 'Hutang pembelian ' || NEW.purchase_number
  FROM chart_of_accounts WHERE code = '2000';

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

-- ── 4. fn_journalize_payment ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_journalize_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, NEW.payment_date,
    CASE WHEN NEW.ar_ap_type = 'receivable' THEN 'Pembayaran Piutang' ELSE 'Pembayaran Hutang' END,
    'payment', NEW.id, NEW.recorded_by)
  RETURNING id INTO v_entry_id;

  IF NEW.ar_ap_type = 'receivable' THEN
    IF NEW.payment_method IN ('cash', 'qris') THEN
      INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
      SELECT v_entry_id, id, NEW.amount, 0, 'Kas masuk (pembayaran piutang)'
      FROM chart_of_accounts WHERE code = '1000';
    ELSE
      INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
      SELECT v_entry_id, id, NEW.amount, 0, 'Bank masuk (pembayaran piutang)'
      FROM chart_of_accounts WHERE code = '1100';
    END IF;
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, NEW.amount, 'Piutang berkurang'
    FROM chart_of_accounts WHERE code = '1200';
  ELSE
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, NEW.amount, 0, 'Hutang berkurang'
    FROM chart_of_accounts WHERE code = '2000';
    IF NEW.payment_method IN ('cash', 'qris') THEN
      INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
      SELECT v_entry_id, id, 0, NEW.amount, 'Kas keluar (pembayaran hutang)'
      FROM chart_of_accounts WHERE code = '1000';
    ELSE
      INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
      SELECT v_entry_id, id, 0, NEW.amount, 'Bank keluar (pembayaran hutang)'
      FROM chart_of_accounts WHERE code = '1100';
    END IF;
  END IF;

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

-- ── 5. process_stock_opname ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_stock_opname(p_opname_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname      RECORD;
  v_item        RECORD;
  v_diff        NUMERIC;
  v_movtype     TEXT;
  v_new_stock   NUMERIC;
  v_adjusted    INTEGER := 0;
  v_entry_id    UUID;
  v_entry_number TEXT;
  v_total_plus  DECIMAL(14,2) := 0;
  v_total_minus DECIMAL(14,2) := 0;
BEGIN
  SELECT * INTO v_opname FROM stock_opnames WHERE id = p_opname_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opname % not found', p_opname_id;
  END IF;
  IF v_opname.status = 'completed' THEN
    RAISE EXCEPTION 'Opname % already completed', p_opname_id;
  END IF;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'Stock Opname ' || v_opname.opname_number, 'opname', p_opname_id,
    COALESCE(v_opname.submitted_by, v_opname.created_by))
  RETURNING id INTO v_entry_id;

  FOR v_item IN
    SELECT soi.*, i.current_stock AS live_stock
    FROM stock_opname_items soi
    JOIN ingredients i ON i.id = soi.ingredient_id
    WHERE soi.opname_id = p_opname_id AND soi.actual_stock IS NOT NULL
    FOR UPDATE OF i
  LOOP
    v_diff := v_item.actual_stock - v_item.live_stock;

    UPDATE stock_opname_items SET difference = (v_item.actual_stock - v_item.system_stock) WHERE id = v_item.id;

    IF v_diff = 0 THEN CONTINUE; END IF;

    v_movtype := CASE WHEN v_diff > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END;
    v_new_stock := v_item.live_stock + v_diff;

    UPDATE ingredients SET current_stock = v_new_stock, updated_at = now() WHERE id = v_item.ingredient_id;

    INSERT INTO inventory_movements (item_type, item_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id, reason)
    VALUES ('ingredient', v_item.ingredient_id, 'opname_adjustment', ABS(v_diff), v_item.unit, v_item.live_stock, v_new_stock, 'opname', p_opname_id,
      COALESCE(v_item.reason, 'Stock opname adjustment'));

    INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, stock_before, stock_after, reference_type, reference_id, reason)
    VALUES (v_item.ingredient_id, v_movtype::TEXT, ABS(v_diff), v_item.unit, v_item.live_stock, v_new_stock, 'opname', p_opname_id,
      COALESCE(v_item.reason, 'Stock opname adjustment'));

    IF v_diff > 0 THEN
      v_total_plus := v_total_plus + (ABS(v_diff) * COALESCE((SELECT average_cost FROM ingredients WHERE id = v_item.ingredient_id), 0));
    ELSE
      v_total_minus := v_total_minus + (ABS(v_diff) * COALESCE((SELECT average_cost FROM ingredients WHERE id = v_item.ingredient_id), 0));
    END IF;

    v_adjusted := v_adjusted + 1;
  END LOOP;

  IF v_total_plus > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_plus, 0, 'Stok opname - selisih plus' FROM chart_of_accounts WHERE code = '1300';
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_plus, 'Stok opname - selisih plus' FROM chart_of_accounts WHERE code = '5800';
  END IF;

  IF v_total_minus > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, v_total_minus, 0, 'Stok opname - selisih minus' FROM chart_of_accounts WHERE code = '5800';
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, v_total_minus, 'Stok opname - selisih minus' FROM chart_of_accounts WHERE code = '1300';
  END IF;

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  UPDATE stock_opnames SET status = 'completed', completed_at = now() WHERE id = p_opname_id;

  RETURN jsonb_build_object('success', true, 'opname_id', p_opname_id, 'items_adjusted', v_adjusted);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ── 6. fn_reverse_sale_journal ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_reverse_sale_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  IF OLD.status != 'completed' OR NEW.status NOT IN ('cancelled', 'refunded') THEN
    RETURN NEW;
  END IF;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'REVERSAL Penjualan ' || NEW.invoice_number, 'reversal', NEW.id, NEW.cashier_id)
  RETURNING id INTO v_entry_id;

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.total, 0, 'REVERSAL Pendapatan ' || NEW.invoice_number FROM chart_of_accounts WHERE code = '4000';

  IF NEW.payment_method IN ('cash', 'qris') THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, NEW.total, 'REVERSAL Kas keluar ' || NEW.invoice_number FROM chart_of_accounts WHERE code = '1000';
  ELSE
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, NEW.total, 'REVERSAL Bank keluar ' || NEW.invoice_number FROM chart_of_accounts WHERE code = '1100';
  END IF;

  IF COALESCE(OLD.cogs, 0) > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, OLD.cogs, 0, 'REVERSAL Persediaan masuk ' || NEW.invoice_number FROM chart_of_accounts WHERE code = '1400';
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, OLD.cogs, 'REVERSAL COGS ' || NEW.invoice_number FROM chart_of_accounts WHERE code = '5000';
  END IF;

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

-- ── 7. fn_reverse_expense_journal ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_reverse_expense_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_account_code TEXT;
BEGIN
  IF OLD.status != 'approved' OR NEW.status != 'rejected' THEN
    RETURN NEW;
  END IF;

  v_account_code := CASE NEW.category
    WHEN 'ingredients' THEN '5100'
    WHEN 'salary' THEN '5200'
    WHEN 'rent' THEN '5300'
    WHEN 'utilities' THEN '5400'
    WHEN 'equipment' THEN '5600'
    ELSE '5700'
  END;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'REVERSAL Pengeluaran: ' || NEW.description, 'reversal', NEW.id, NEW.created_by)
  RETURNING id INTO v_entry_id;

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.amount, 0, 'REVERSAL Kas masuk: ' || NEW.description FROM chart_of_accounts WHERE code = '1000';

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.amount, 'REVERSAL Pengeluaran: ' || NEW.description FROM chart_of_accounts WHERE code = v_account_code;

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;
