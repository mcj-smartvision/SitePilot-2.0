-- =====================================================
-- Storekeeper: invoice date + number on receipts
-- Run in Supabase SQL Editor after migration 21
-- =====================================================

ALTER TABLE public.inventory_scans
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date DATE;

CREATE OR REPLACE FUNCTION public.confirm_inventory_receipt(
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
      WHEN v_note IS NULL THEN 'Invoice #' || v_inv_no
      ELSE v_note || ' | Invoice #' || v_inv_no
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

    SELECT id INTO v_inv_id
    FROM public.inventory_items
    WHERE project_id = p_project_id AND lower(name) = lower(v_name)
    LIMIT 1;

    IF v_inv_id IS NULL THEN
      INSERT INTO public.inventory_items (project_id, name, current_stock, unit, min_stock, last_updated_at)
      VALUES (p_project_id, v_name, 0, v_unit, 0, now())
      RETURNING id INTO v_inv_id;
    END IF;

    INSERT INTO public.inventory_transactions (item_id, type, quantity, unit, date, note, created_by)
    VALUES (v_inv_id, 'IN', v_qty, v_unit, v_tx_date, v_note, v_user);

    UPDATE public.inventory_items
    SET current_stock = current_stock + v_qty,
        unit = v_unit,
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

REVOKE ALL ON FUNCTION public.confirm_inventory_receipt(UUID, JSONB, DATE, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_inventory_receipt(UUID, JSONB, DATE, TEXT, UUID, TEXT) TO authenticated;

-- Drop old 4-parameter overload if migration 21 was applied
DROP FUNCTION IF EXISTS public.confirm_inventory_receipt(UUID, JSONB, TEXT, UUID);
