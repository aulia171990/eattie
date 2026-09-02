-- ============================================================
-- Sale-time variant stock decrement (Risk #13 fix)
-- ============================================================
-- The live process_sale() deducted only products.current_stock.
-- Sale items already carry variant_id (sale_items.variant_id), but
-- the variant's own stock (product_variants.stock) was never reduced,
-- so selling a variant left its per-SKU stock stale.
--
-- This migration:
--   1. (Re)creates decrement_variant_stock() helper (idempotent).
--   2. Re-creates process_sale() with variant stock deduction merged
--      into the validation + deduct passes. Signature unchanged
--      (p_sale_id uuid) so PostgREST won't overload.
--
-- NOTE: process_sale() lives only in live Supabase. The body below is
-- reconstructed from supabase/migration-sql and the variant logic added.
-- Diff against the live definition before applying to be safe.

-- 1. Helper (idempotent)
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_variant_id uuid,
  p_qty integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'qty harus positif');
  END IF;

  SELECT stock INTO v_current
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'varian tidak ditemukan');
  END IF;

  IF v_current < p_qty THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'stok varian tidak cukup',
      'available', v_current,
      'requested', p_qty
    );
  END IF;

  UPDATE public.product_variants
  SET stock = stock - p_qty,
      updated_at = now()
  WHERE id = p_variant_id;

  RETURN jsonb_build_object('success', true, 'remaining', v_current - p_qty);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, integer) TO authenticated;

-- 2. process_sale() with variant stock deduction
CREATE OR REPLACE FUNCTION public.process_sale(p_sale_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sale          RECORD;
  v_item          RECORD;
  v_product       RECORD;
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
  v_total_cogs    NUMERIC := 0;
  v_errors        TEXT[]  := '{}';
  v_var_res       JSONB;
BEGIN
  -- Lock sale
  SELECT * INTO v_sale
  FROM sales
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

  -- ---- VALIDATION PASS ----
  FOR v_item IN
    SELECT si.*, p.name AS prod_name, p.current_stock, p.cost_price
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
  LOOP
    IF v_item.current_stock < v_item.quantity THEN
      v_errors := array_append(v_errors,
        format('Stok %s tidak cukup: butuh %s, tersisa %.0f',
          v_item.prod_name, v_item.quantity, v_item.current_stock));
    END IF;

    -- Variant stock availability
    IF v_item.variant_id IS NOT NULL THEN
      SELECT public.decrement_variant_stock(v_item.variant_id, v_item.quantity)
        INTO v_var_res;
      IF (v_var_res->>'success') <> 'true' THEN
        v_errors := array_append(v_errors,
          format('Stok varian %s: %s', v_item.prod_name, v_var_res->>'error'));
      ELSE
        -- revert the just-applied decrement so the DEDUCT pass is the
        -- single source of truth (keeps the transaction atomic)
        UPDATE public.product_variants
          SET stock = stock + v_item.quantity,
              updated_at = now()
        WHERE id = v_item.variant_id;
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi: %', array_to_string(v_errors, '; ');
  END IF;

  -- ---- DEDUCT PRODUCT STOCK ----
  FOR v_item IN
    SELECT si.*, p.current_stock, p.cost_price
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
    FOR UPDATE OF p
  LOOP
    v_stock_before := v_item.current_stock;
    v_stock_after  := v_stock_before - v_item.quantity;

    UPDATE products SET
      current_stock = v_stock_after,
      updated_at    = now()
    WHERE id = v_item.product_id;

    -- Record product movement
    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after,
      unit_cost, total_cost,
      reference_type, reference_id
    ) VALUES (
      'product', v_item.product_id, 'sale_out',
      v_item.quantity, 'pcs',
      v_stock_before, v_stock_after,
      COALESCE(v_item.cost_price, 0),
      v_item.quantity * COALESCE(v_item.cost_price, 0),
      'sale', p_sale_id
    );

    v_total_cogs := v_total_cogs + (v_item.quantity * COALESCE(v_item.cost_price, 0));
  END LOOP;

  -- ---- UPDATE SALE with COGS + GROSS PROFIT ----
  UPDATE sales SET
    cogs           = v_total_cogs,
    gross_profit   = total - v_total_cogs,
    stock_deducted = true,
    status         = 'completed'
  WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'success',      true,
    'sale_id',      p_sale_id,
    'total_cogs',   v_total_cogs,
    'gross_profit', v_sale.total - v_total_cogs
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$;
