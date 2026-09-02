-- ============================================================================
-- 000043: Fix process_sale() stock source for variant items.
-- BEFORE: variant items read/wrote `variant_stock` (old table).
-- AFTER : variant items read/write `product_variants.stock`
--         (per goal #4 + audit B.2). Non-variant items keep using
--         products.current_stock exactly as before.
-- product_variants.stock already exists in live DB; complete_production_batch
-- already writes to it, so this aligns sale-time decrement with production.
-- Idempotent: drops the old signature first.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_sale(p_sale_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_sale          RECORD;
  v_item          RECORD;
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
  v_total_cogs    NUMERIC := 0;
  v_errors        TEXT[]   := '{}';
BEGIN
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale % not found', p_sale_id;
  END IF;

  IF v_sale.stock_deducted THEN
    RAISE EXCEPTION 'Sale % already processed (anti double-submit)', p_sale_id;
  END IF;

  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Sale % is cancelled', p_sale_id;
  END IF;

  -- VALIDATION PASS
  FOR v_item IN
    SELECT
      si.*,
      p.name AS prod_name,
      p.current_stock AS product_stock,
      COALESCE(p.cost_price, 0) AS cost_price,
      pv.stock AS variant_stock_qty
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    LEFT JOIN public.product_variants pv ON pv.id = si.variant_id
    WHERE si.sale_id = p_sale_id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      IF v_item.variant_stock_qty IS NULL OR v_item.variant_stock_qty < v_item.quantity THEN
        v_errors := array_append(
          v_errors,
          format(
            'Stok varian %s tidak cukup: butuh %s, tersisa %s',
            COALESCE(v_item.variant_name, v_item.prod_name),
            v_item.quantity,
            COALESCE(v_item.variant_stock_qty, 0)
          )
        );
      END IF;
    ELSE
      IF v_item.product_stock < v_item.quantity THEN
        v_errors := array_append(
          v_errors,
          format(
            'Stok %s tidak cukup: butuh %s, tersisa %.0f',
            v_item.prod_name,
            v_item.quantity,
            v_item.product_stock
          )
        );
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi: %', array_to_string(v_errors, '; ');
  END IF;

  -- DEDUCT STOCK
  FOR v_item IN
    SELECT
      si.*,
      p.name AS prod_name,
      p.current_stock AS product_stock,
      COALESCE(p.cost_price, 0) AS cost_price,
      pv.stock AS variant_stock_qty
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    LEFT JOIN public.product_variants pv ON pv.id = si.variant_id
    WHERE si.sale_id = p_sale_id
    FOR UPDATE OF p, pv
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      v_stock_before := v_item.variant_stock_qty;
      v_stock_after := v_stock_before - v_item.quantity;

      UPDATE public.product_variants
      SET stock = v_stock_after,
          updated_at = now()
      WHERE id = v_item.variant_id;

      INSERT INTO public.inventory_movements (
        item_type, item_id, movement_type, quantity, unit,
        stock_before, stock_after, unit_cost, total_cost,
        reference_type, reference_id
      ) VALUES (
        'variant', v_item.variant_id, 'sale_out', v_item.quantity, 'pcs',
        v_stock_before, v_stock_after,
        v_item.cost_price,
        v_item.quantity * v_item.cost_price,
        'sale', p_sale_id
      );
    ELSE
      v_stock_before := v_item.product_stock;
      v_stock_after := v_stock_before - v_item.quantity;

      UPDATE public.products
      SET current_stock = v_stock_after,
          updated_at = now()
      WHERE id = v_item.product_id;

      INSERT INTO public.inventory_movements (
        item_type, item_id, movement_type, quantity, unit,
        stock_before, stock_after, unit_cost, total_cost,
        reference_type, reference_id
      ) VALUES (
        'product', v_item.product_id, 'sale_out', v_item.quantity, 'pcs',
        v_stock_before, v_stock_after,
        v_item.cost_price,
        v_item.quantity * v_item.cost_price,
        'sale', p_sale_id
      );
    END IF;

    v_total_cogs := v_total_cogs + (v_item.quantity * v_item.cost_price);
  END LOOP;

  UPDATE public.sales
  SET cogs = v_total_cogs,
      gross_profit = total - v_total_cogs,
      stock_deducted = true,
      status = 'completed'
  WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', p_sale_id,
    'total_cogs', v_total_cogs,
    'gross_profit', v_sale.total - v_total_cogs
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_sale(uuid) TO authenticated;
