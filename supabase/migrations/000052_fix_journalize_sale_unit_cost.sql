-- ============================================================================
-- 000052: Fix fn_journalize_sale() trigger — "column pi.unit_cost does not exist"
--
-- ROOT CAUSE: The trigger fn_journalize_sale() (fired on sales.status → 'completed')
--   computes COGS by joining sale_items → product_inventory AS pi and reading
--   pi.unit_cost. But product_inventory has NO unit_cost column (its columns are
--   product_id, variant_id, batch_id, quantity). So the trigger raises
--   "column pi.unit_cost does not exist" the moment process_sale() marks the
--   sale 'completed', which surfaces to the POS as "Stok tidak mencukupi atau
--   gagal diproses".
--
-- FIX: Rewrite the COGS loop to read cost from products.cost_price (the actual
--   per-product cost field) instead of the non-existent product_inventory.unit_cost.
--   The product_inventory join is dropped — it added no value for cost lookup.
--
-- IDEMPOTENT: CREATE OR REPLACE on the trigger function. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_journalize_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
    SELECT v_entry_id, id, NEW.total, 0, 'Bank masuk dari ' || NEW.invoice_number
    FROM chart_of_accounts WHERE code = '1100';
  END IF;

  -- Credit: Penjualan (4000)
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, id, 0, NEW.total, 'Pendapatan dari ' || NEW.invoice_number
  FROM chart_of_accounts WHERE code = '4000';

  -- COGS: sum from products.cost_price (NOT product_inventory.unit_cost — that column does not exist)
  FOR v_line IN
    SELECT si.product_id, si.quantity, COALESCE(p.cost_price, 0) AS unit_cost
    FROM sale_items si
    LEFT JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = NEW.id
  LOOP
    IF v_line.unit_cost > 0 THEN
      v_total_cogs := v_total_cogs + (v_line.quantity * v_line.unit_cost);
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

GRANT EXECUTE ON FUNCTION public.fn_journalize_sale() TO authenticated;
