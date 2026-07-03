-- =====================================================
-- Storekeeper Inventory Module (isolated tables + RPC)
-- Run in Supabase SQL Editor after migration 20
-- Does NOT modify existing tables
-- =====================================================

-- -----------------------------------------------------
-- inventory_items
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'عدد',
  min_stock NUMERIC NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_stock_non_negative CHECK (current_stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_project_id ON public.inventory_items(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_project_name ON public.inventory_items(project_id, lower(name));

-- -----------------------------------------------------
-- inventory_transactions
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.inventory_transactions(date);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type_date ON public.inventory_transactions(type, date);

-- -----------------------------------------------------
-- inventory_scans (AI invoice capture)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed')),
  extracted_data JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_scans_project_id ON public.inventory_scans(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_scans_status ON public.inventory_scans(status);

-- -----------------------------------------------------
-- RLS
-- -----------------------------------------------------

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_items_select_member ON public.inventory_items;
CREATE POLICY inventory_items_select_member ON public.inventory_items
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS inventory_items_insert_member ON public.inventory_items;
CREATE POLICY inventory_items_insert_member ON public.inventory_items
  FOR INSERT WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS inventory_items_update_member ON public.inventory_items;
CREATE POLICY inventory_items_update_member ON public.inventory_items
  FOR UPDATE USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS inventory_transactions_select_member ON public.inventory_transactions;
CREATE POLICY inventory_transactions_select_member ON public.inventory_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = item_id
        AND (public.is_project_member(i.project_id) OR public.is_system_admin())
    )
  );

DROP POLICY IF EXISTS inventory_transactions_insert_member ON public.inventory_transactions;
CREATE POLICY inventory_transactions_insert_member ON public.inventory_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = item_id
        AND (public.is_project_member(i.project_id) OR public.is_system_admin())
    )
  );

DROP POLICY IF EXISTS inventory_scans_select_member ON public.inventory_scans;
CREATE POLICY inventory_scans_select_member ON public.inventory_scans
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS inventory_scans_insert_member ON public.inventory_scans;
CREATE POLICY inventory_scans_insert_member ON public.inventory_scans
  FOR INSERT WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS inventory_scans_update_member ON public.inventory_scans;
CREATE POLICY inventory_scans_update_member ON public.inventory_scans
  FOR UPDATE USING (public.is_project_member(project_id) OR public.is_system_admin());

-- -----------------------------------------------------
-- RPC: confirm scanned / manual receipt into inventory
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_inventory_receipt(
  p_project_id UUID,
  p_items JSONB,
  p_note TEXT DEFAULT NULL,
  p_scan_id UUID DEFAULT NULL
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
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_project_member(p_project_id) AND NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized for this project';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
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
    VALUES (v_inv_id, 'IN', v_qty, v_unit, now(), p_note, v_user);

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
        extracted_data = COALESCE(extracted_data, p_items)
    WHERE id = p_scan_id AND project_id = p_project_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'saved_count', jsonb_array_length(v_rows), 'items', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_inventory_receipt(UUID, JSONB, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_inventory_receipt(UUID, JSONB, TEXT, UUID) TO authenticated;
