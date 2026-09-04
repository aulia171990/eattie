-- ============================================================================
-- 000064: Inventory Valuation — Recipe Standard Cost + Auto-update cost_price
-- ============================================================================
-- P1: Inventory valuation method
--   1. Recipe standard cost = SUM(ingredient.average_cost × recipe_ingredients.quantity) / recipe.yield_quantity
--   2. products.cost_price auto-update saat production batch completed
--   3. fn_journalize_sale COGS: batch_cost > recipe_cost > product_cost_price
-- ============================================================================

-- ── PART 1: Function hitung recipe standard cost ───────────────────────────
CREATE OR REPLACE FUNCTION public.fn_calculate_recipe_cost(p_recipe_id UUID)
RETURNS DECIMAL(14,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cost DECIMAL(14,2) := 0;
  v_yield INTEGER;
BEGIN
  -- Get yield quantity
  SELECT yield_quantity INTO v_yield
  FROM recipes WHERE id = p_recipe_id;
  
  IF v_yield IS NULL OR v_yield <= 0 THEN
    v_yield := 1;
  END IF;
  
  -- Sum ingredient costs (using average_cost)
  SELECT COALESCE(SUM(ri.quantity * COALESCE(i.average_cost, i.price_per_unit, 0)), 0)
  INTO v_total_cost
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = p_recipe_id;
  
  RETURN ROUND(v_total_cost / v_yield, 2);
END;
$$;

-- ── PART 2: Trigger update products.cost_price saat batch completed ────────
CREATE OR REPLACE FUNCTION public.fn_update_product_cost_from_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NEW.cost_per_unit > 0 THEN
      UPDATE products SET
        cost_price = NEW.cost_per_unit,
        updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_product_cost ON production_batches;
CREATE TRIGGER trg_update_product_cost AFTER UPDATE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_product_cost_from_batch();


-- ── PART 3: Update fn_journalize_sale COGS logic ───────────────────────────
-- Priority: batch_cost > recipe_standard_cost > product_cost_price
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
  v_unit_cost DECIMAL(14,2);
  v_recipe_cost DECIMAL(14,2);
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

  -- COGS: batch_cost > recipe_cost > product_cost_price
  FOR v_line IN
    SELECT 
      si.product_id, 
      si.quantity,
      si.batch_id
    FROM sale_items si
    WHERE si.sale_id = NEW.id
  LOOP
    -- Priority 1: batch cost
    v_unit_cost := 0;
    
    IF v_line.batch_id IS NOT NULL THEN
      SELECT cost_per_unit INTO v_unit_cost
      FROM production_batches WHERE id = v_line.batch_id;
    END IF;
    
    -- Priority 2: recipe standard cost
    IF v_unit_cost IS NULL OR v_unit_cost <= 0 THEN
      -- Find recipe for this product and calculate standard cost
      SELECT fn_calculate_recipe_cost(r.id) INTO v_recipe_cost
      FROM recipes r
      WHERE r.product_id = v_line.product_id
      LIMIT 1;
      
      v_unit_cost := COALESCE(v_recipe_cost, 0);
    END IF;
    
    -- Priority 3: product cost_price fallback
    IF v_unit_cost <= 0 THEN
      SELECT COALESCE(cost_price, 0) INTO v_unit_cost
      FROM products WHERE id = v_line.product_id;
    END IF;
    
    IF v_unit_cost > 0 THEN
      v_total_cogs := v_total_cogs + (v_line.quantity * v_unit_cost);
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

DROP TRIGGER IF EXISTS trg_journalize_sale ON sales;
CREATE TRIGGER trg_journalize_sale AFTER UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_journalize_sale();
