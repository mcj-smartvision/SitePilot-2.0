-- Financial layer: costs, invoices, cash-in, major items
-- Run after migration 33

CREATE OR REPLACE FUNCTION public.is_project_accountant(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.member_positions mp ON mp.project_member_id = pm.id
    JOIN public.positions pos ON pos.id = mp.position_id
    WHERE pm.user_id = auth.uid()
      AND pm.project_id = p_project_id
      AND pm.is_active = true
      AND pos.key = 'project_accountant'
  ) OR public.is_system_admin();
$$;

-- ─── financial_costs ───
CREATE TABLE IF NOT EXISTS public.financial_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('materials', 'labor', 'equipment', 'subcontractor', 'overhead')),
  item_code TEXT,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  invoice_reference TEXT,
  major_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ─── financial_invoices ───
CREATE TABLE IF NOT EXISTS public.financial_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  total_amount NUMERIC(18, 2) NOT NULL CHECK (total_amount >= 0),
  work_done_amount NUMERIC(18, 2) DEFAULT 0,
  materials_on_site_amount NUMERIC(18, 2) DEFAULT 0,
  adjustments_amount NUMERIC(18, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'approved', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ─── financial_cash_ins ───
CREATE TABLE IF NOT EXISTS public.financial_cash_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.financial_invoices(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  bank_account TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ─── financial_major_items ───
CREATE TABLE IF NOT EXISTS public.financial_major_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);

ALTER TABLE public.financial_costs
  DROP CONSTRAINT IF EXISTS financial_costs_major_item_id_fkey;

ALTER TABLE public.financial_costs
  ADD CONSTRAINT financial_costs_major_item_id_fkey
  FOREIGN KEY (major_item_id) REFERENCES public.financial_major_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_costs_project_date
  ON public.financial_costs(project_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_invoices_project_status
  ON public.financial_invoices(project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_cash_ins_project_date
  ON public.financial_cash_ins(project_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_major_items_project
  ON public.financial_major_items(project_id, code);

ALTER TABLE public.financial_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_cash_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_major_items ENABLE ROW LEVEL SECURITY;

-- Read: any project member; Write: project accountant or admin
DROP POLICY IF EXISTS financial_costs_select ON public.financial_costs;
CREATE POLICY financial_costs_select ON public.financial_costs
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_costs_insert ON public.financial_costs;
CREATE POLICY financial_costs_insert ON public.financial_costs
  FOR INSERT WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_costs_update ON public.financial_costs;
CREATE POLICY financial_costs_update ON public.financial_costs
  FOR UPDATE USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_costs_delete ON public.financial_costs;
CREATE POLICY financial_costs_delete ON public.financial_costs
  FOR DELETE USING (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_invoices_select ON public.financial_invoices;
CREATE POLICY financial_invoices_select ON public.financial_invoices
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_invoices_write ON public.financial_invoices;
CREATE POLICY financial_invoices_write ON public.financial_invoices
  FOR ALL USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_cash_ins_select ON public.financial_cash_ins;
CREATE POLICY financial_cash_ins_select ON public.financial_cash_ins
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_cash_ins_write ON public.financial_cash_ins;
CREATE POLICY financial_cash_ins_write ON public.financial_cash_ins
  FOR ALL USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_major_items_select ON public.financial_major_items;
CREATE POLICY financial_major_items_select ON public.financial_major_items
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS financial_major_items_write ON public.financial_major_items;
CREATE POLICY financial_major_items_write ON public.financial_major_items
  FOR ALL USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());
