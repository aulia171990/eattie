-- ============================================================================
-- 000067: Fiscal Period Guard + AR Creation Journalize + Production Journalize
-- ============================================================================
-- 1. Fiscal period guard — trigger cek closed period sebelum insert journal_entries
-- 2. AR creation journalize — saat accounts_receivable dibuat dari sale kredit
-- 3. Production batch journalize — saat batch completed, Dr Persediaan Produk, Cr Bahan Baku
-- ============================================================================

-- ── PART 1: Fiscal Period Guard ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_fiscal_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if entry_date falls within a closed fiscal period
  SELECT COUNT(*) INTO v_count
  FROM fiscal_periods
  WHERE is_closed = true
    AND start_date <= NEW.entry_date
    AND end_date >= NEW.entry_date;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot create journal entry: date % falls within a closed fiscal period', NEW.entry_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_fiscal_period ON journal_entries;
CREATE TRIGGER trg_check_fiscal_period BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_fiscal_period();


-- ── PART 2: AR Creation Journalize ─────────────────────────────────────────
-- Saat AR dibuat dari sale kredit: Dr Piutang Usaha (1200), Cr Penjualan (4000)
CREATE OR REPLACE FUNCTION public.fn_journalize_ar_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  -- Only for AR created from sale source
  IF NEW.source != 'sale' OR NEW.source_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, NEW.due_date, 'Piutang dari ' || NEW.invoice_number, 'ar_creation', NEW.id, NEW.created_by)
  RETURNING id INTO v_entry_id;

  -- Debit: Piutang Usaha (1200)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.amount, 0, 'Piutang usaha dari ' || NEW.invoice_number
  FROM chart_of_accounts WHERE code = '1200';

  -- Credit: Penjualan (4000)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.amount, 'Pendapatan piutang ' || NEW.invoice_number
  FROM chart_of_accounts WHERE code = '4000';

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journalize_ar_creation ON accounts_receivable;
CREATE TRIGGER trg_journalize_ar_creation AFTER INSERT ON accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.fn_journalize_ar_creation();


-- ── PART 3: Production Batch Journalize ─────────────────────────────────────
-- Saat batch completed: Dr Persediaan Produk Jadi (1400), Cr Persediaan Bahan Baku (1300)
CREATE OR REPLACE FUNCTION public.fn_journalize_production()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  -- Only when status changes to 'completed'
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only if there's a cost to record
  IF NEW.total_cost IS NULL OR NEW.total_cost <= 0 THEN
    RETURN NEW;
  END IF;

  v_entry_number := next_doc_number('JE', 'journal_entries', 'entry_number');

  INSERT INTO journal_entries (entry_number, entry_date, description, source, source_id, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'Produksi ' || NEW.batch_number, 'production', NEW.id, NEW.created_by)
  RETURNING id INTO v_entry_id;

  -- Debit: Persediaan Produk Jadi (1400)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, NEW.total_cost, 0, 'Persediaan produk jadi dari ' || NEW.batch_number
  FROM chart_of_accounts WHERE code = '1400';

  -- Credit: Persediaan Bahan Baku (1300)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.total_cost, 'Bahan baku terpakai untuk ' || NEW.batch_number
  FROM chart_of_accounts WHERE code = '1300';

  UPDATE journal_entries SET
    total_debit = (SELECT COALESCE(sum(debit), 0) FROM journal_lines WHERE entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(sum(credit), 0) FROM journal_lines WHERE entry_id = v_entry_id)
  WHERE id = v_entry_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journalize_production ON production_batches;
CREATE TRIGGER trg_journalize_production AFTER UPDATE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION public.fn_journalize_production();
