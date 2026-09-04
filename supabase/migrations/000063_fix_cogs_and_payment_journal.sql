-- ============================================================================
-- 000063: Fix COGS method + Add payment journalize trigger
-- ============================================================================
-- P0-1: COGS sekarang pakai production_batches.cost_per_unit (actual cost)
--        bukan products.cost_price yang statis dan tidak otomatis update.
--        Fallback ke products.cost_price hanya jika batch_id null.
--
-- P0-2: Payment AR/AP sekarang auto-journalize:
--        AR payment: Dr Kas/Bank (1000/1100), Cr Piutang Usaha (1200)
--        AP payment: Dr Hutang Usaha (2000), Cr Kas/Bank (1000/1100)
-- ============================================================================

-- ── PART 1: Fix fn_journalize_sale() ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_journalize_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- COGS: use actual production batch cost first, fallback to product cost_price
  FOR v_line IN
    SELECT 
      si.product_id, 
      si.quantity, 
      COALESCE(pb.cost_per_unit, p.cost_price, 0) AS unit_cost
    FROM sale_items si
    LEFT JOIN production_batches pb ON pb.id = si.batch_id
    LEFT JOIN products p ON p.id = si.product_id
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
$$;

-- Trigger already exists from 000037, just ensure it's bound to the new function version
DROP TRIGGER IF EXISTS trg_journalize_sale ON sales;
CREATE TRIGGER trg_journalize_sale AFTER UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_journalize_sale();


-- ── PART 2: Payment journalize trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_journalize_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_account_id UUID;
  v_remaining DECIMAL(14,2);
  v_description TEXT;
BEGIN
  -- Generate entry number
  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (
    'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(
      (SELECT count(*) + 1 FROM journal_entries WHERE entry_date = CURRENT_DATE)::text, 3, '0'
    ),
    NEW.payment_date,
    CASE 
      WHEN NEW.ar_ap_type = 'receivable' THEN 'Pembayaran Piutang'
      ELSE 'Pembayaran Hutang'
    END,
    'payment',
    NEW.id,
    NEW.recorded_by
  ) RETURNING id INTO v_entry_id;

  IF NEW.ar_ap_type = 'receivable' THEN
    -- AR payment: Dr Kas/Bank (1000/1100), Cr Piutang Usaha (1200)
    
    -- Debit: Kas or Bank based on payment method
    IF NEW.payment_method IN ('cash', 'qris') THEN
      INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
      SELECT v_entry_id, id, NEW.amount, 0, 'Kas masuk (pembayaran piutang)'
      FROM chart_of_accounts WHERE code = '1000';
    ELSE
      INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
      SELECT v_entry_id, id, NEW.amount, 0, 'Bank masuk (pembayaran piutang)'
      FROM chart_of_accounts WHERE code = '1100';
    END IF;
    
    -- Credit: Piutang Usaha (1200)
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, 0, NEW.amount, 'Piutang berkurang'
    FROM chart_of_accounts WHERE code = '1200';

  ELSE
    -- AP payment: Dr Hutang Usaha (2000), Cr Kas/Bank (1000/1100)
    
    -- Debit: Hutang Usaha (2000)
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, NEW.amount, 0, 'Hutang berkurang'
    FROM chart_of_accounts WHERE code = '2000';
    
    -- Credit: Kas or Bank based on payment method
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

  -- Update totals
  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

-- Trigger on payment_records
DROP TRIGGER IF EXISTS trg_journalize_payment ON payment_records;
CREATE TRIGGER trg_journalize_payment AFTER INSERT ON payment_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_journalize_payment();
