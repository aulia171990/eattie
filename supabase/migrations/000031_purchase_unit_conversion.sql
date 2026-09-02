-- ============================================================
-- 000031: Konversi satuan beli -> base unit di process_purchase
-- ============================================================
-- Masalah: process_purchase() menambah stok dengan
--   v_stock_after := v_stock_before + v_item.quantity_received
-- dan menyimpan price_per_unit = v_item.unit_price SECARA MENTAH,
-- mengabaikan ingredients.purchase_unit + conversion_rate.
--
-- Akibatnya jika bahan dibeli per "karung" (purchase_unit) dengan
-- conversion_rate (1 karung = N base_unit), maka:
--   - stok yang masuk salah (dihitung sebagai base_unit, padahal purchase_unit)
--   - harga per base_unit salah (terlalu mahal/kurang sesuai)
--
-- Perbaikan:
--   Bila ingredient.purchase_unit terisi, konversi:
--     base_qty    = quantity_received * conversion_rate
--     price_base  = unit_price / conversion_rate        -- RUMUS BENAR (bagi)
--   lalu stok & harga disimpan dalam base_unit.
--   Bila purchase_unit kosong -> perilaku lama (backward compatible,
--   conversion_rate default 1).
--
-- Idempoten / aman dijalankan ulang. Signature tidak diubah.

CREATE OR REPLACE FUNCTION public.process_purchase(p_purchase_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_purchase      RECORD;
  v_item          RECORD;
  v_ing           RECORD;
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
  v_base_qty      NUMERIC;
  v_price_base    NUMERIC;
  v_base_unit     TEXT;
  v_conv          NUMERIC;
  v_new_avg_cost  NUMERIC;
  v_processed     INTEGER := 0;
BEGIN
  -- Lock purchase row
  SELECT * INTO v_purchase
  FROM stock_purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase % not found', p_purchase_id;
  END IF;

  IF v_purchase.status = 'received' THEN
    RAISE EXCEPTION 'Purchase % already received', p_purchase_id;
  END IF;

  IF v_purchase.status = 'cancelled' THEN
    RAISE EXCEPTION 'Purchase % is cancelled', p_purchase_id;
  END IF;

  -- Process each item
  FOR v_item IN
    SELECT * FROM stock_purchase_items WHERE purchase_id = p_purchase_id
  LOOP
    CONTINUE WHEN v_item.quantity_received <= 0;

    -- Lock ingredient
    SELECT * INTO v_ing
    FROM ingredients
    WHERE id = v_item.ingredient_id
    FOR UPDATE;

    IF NOT FOUND THEN CONTINUE; END IF;

    -- Convert received qty + unit price from purchase_unit -> base_unit
    v_conv := COALESCE(v_ing.conversion_rate, 1);
    IF v_conv = 0 THEN v_conv := 1; END IF;

    IF v_ing.purchase_unit IS NOT NULL AND v_ing.purchase_unit <> '' THEN
      v_base_qty   := v_item.quantity_received * v_conv;
      v_price_base := v_item.unit_price / v_conv;
      v_base_unit  := v_ing.base_unit;
    ELSE
      v_base_qty   := v_item.quantity_received;
      v_price_base := v_item.unit_price;
      v_base_unit  := v_item.unit;
    END IF;

    v_stock_before := v_ing.current_stock;
    v_stock_after  := v_stock_before + v_base_qty;

    -- Weighted average cost (all in base_unit terms)
    IF v_stock_before + v_base_qty > 0 THEN
      v_new_avg_cost := (
        (v_stock_before * COALESCE(v_ing.average_cost, v_ing.price_per_unit, 0))
        + (v_base_qty * v_price_base)
      ) / (v_stock_before + v_base_qty);
    ELSE
      v_new_avg_cost := v_price_base;
    END IF;

    -- Update ingredient stock + average cost + per-base price
    UPDATE ingredients SET
      current_stock       = v_stock_after,
      average_cost        = v_new_avg_cost,
      last_purchase_price = v_price_base,
      price_per_unit      = v_price_base,
      updated_at          = now()
    WHERE id = v_item.ingredient_id;

    -- Insert into unified inventory_movements (quantity/unit in base_unit)
    INSERT INTO inventory_movements (
      item_type, item_id, movement_type, quantity, unit,
      stock_before, stock_after, unit_cost, total_cost,
      reference_type, reference_id,
      batch_code, expiry_date, created_by
    ) VALUES (
      'ingredient', v_item.ingredient_id, 'purchase_in',
      v_base_qty, v_base_unit,
      v_stock_before, v_stock_after,
      v_price_base, v_base_qty * v_price_base,
      'purchase', p_purchase_id,
      v_item.batch_code, v_item.expiry_date,
      v_purchase.created_by
    );

    -- Also insert into legacy stock_movements for backward compat
    INSERT INTO stock_movements (
      ingredient_id, movement_type, quantity, unit,
      stock_before, stock_after,
      reference_type, reference_id,
      batch_code, expiry_date, created_by
    ) VALUES (
      v_item.ingredient_id, 'purchase_in',
      v_base_qty, v_base_unit,
      v_stock_before, v_stock_after,
      'purchase', p_purchase_id,
      v_item.batch_code, v_item.expiry_date,
      v_purchase.created_by
    );

    v_processed := v_processed + 1;
  END LOOP;

  -- Mark purchase received
  UPDATE stock_purchases SET
    status        = 'received',
    received_date = CURRENT_DATE,
    updated_at    = now()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'items_processed', v_processed,
    'purchase_id', p_purchase_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE; -- triggers automatic rollback
END;
$function$;
