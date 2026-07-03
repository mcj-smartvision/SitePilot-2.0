-- =====================================================
-- Storekeeper: stock OUT (dispatch) RPC
-- Run after migration 22
-- =====================================================

CREATE OR REPLACE FUNCTION public.confirm_inventory_dispatch(
  p_project_id UUID,
  p_items JSONB,
  p_invoice_date DATE,
  p_note TEXT DEFAULT NULL,
  p_scan_id UUID DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_item JSONB;
  v_inv_id UUID;
  v_name TEXT;
  v_qty NUMERIC;
  v_unit TEXT;
  v_current NUMERIC;
  v_rows JSONB := '[]'::JSONB;
  v_tx_date TIMESTAMPTZ;
  v_note TEXT;
  v_inv_no TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_project_member(p_project_id) AND NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized for this project';
  END IF;

  IF p_invoice_date IS NULL THEN
    RAISE EXCEPTION 'Invoice date is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  v_tx_date := p_invoice_date::TIMESTAMPTZ;
  v_inv_no := NULLIF(trim(p_invoice_number), '');
  v_note := NULLIF(trim(p_note), '');

  IF v_inv_no IS NOT NULL THEN
    v_note := CASE
      WHEN v_note IS NULL THEN 'Dispatch #' || v_inv_no
      ELSE v_note || ' | Dispatch #' || v_inv_no
    END;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_name := trim(v_item->>'name');
    v_qty := NULLIF(trim(v_item->>'quantity'), '')::NUMERIC;
    v_unit := COALESCE(NULLIF(trim(v_item->>'unit'), ''), 'عدد');

    IF v_name IS NULL OR v_name = '' OR v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id, current_stock INTO v_inv_id, v_current
    FROM public.inventory_items
    WHERE project_id = p_project_id AND lower(name) = lower(v_name)
    LIMIT 1;

    IF v_inv_id IS NULL THEN
      RAISE EXCEPTION 'Item not in stock: %', v_name;
    END IF;

    IF v_current < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for % (available: %, requested: %)', v_name, v_current, v_qty;
    END IF;

    INSERT INTO public.inventory_transactions (item_id, type, quantity, unit, date, note, created_by)
    VALUES (v_inv_id, 'OUT', v_qty, v_unit, v_tx_date, v_note, v_user);

    UPDATE public.inventory_items
    SET current_stock = current_stock - v_qty,
        last_updated_at = now()
    WHERE id = v_inv_id;

    v_rows := v_rows || jsonb_build_object(
      'item_id', v_inv_id,
      'name', v_name,
      'quantity', v_qty,
      'unit', v_unit
    );
  END LOOP;

  IF jsonb_array_length(v_rows) = 0 THEN
    RAISE EXCEPTION 'No valid items to save';
  END IF;

  IF p_scan_id IS NOT NULL THEN
    UPDATE public.inventory_scans
    SET status = 'processed',
        extracted_data = COALESCE(extracted_data, p_items),
        invoice_number = v_inv_no,
        invoice_date = p_invoice_date
    WHERE id = p_scan_id AND project_id = p_project_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'saved_count', jsonb_array_length(v_rows), 'items', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_inventory_dispatch(UUID, JSONB, DATE, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_inventory_dispatch(UUID, JSONB, DATE, TEXT, UUID, TEXT) TO authenticated;
