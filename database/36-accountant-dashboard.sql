-- Accountant Dashboard: vendor bills, invoice extensions, stock valuation, tightened RLS
-- Run after migration 35

-- ─── Extend financial_invoices ───
ALTER TABLE public.financial_invoices
  ADD COLUMN IF NOT EXISTS retention_held NUMERIC(18, 2) NOT NULL DEFAULT 0
    CHECK (retention_held >= 0),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Normalize legacy status values
UPDATE public.financial_invoices SET status = 'submitted' WHERE status = 'sent';

ALTER TABLE public.financial_invoices
  DROP CONSTRAINT IF EXISTS financial_invoices_status_check;

ALTER TABLE public.financial_invoices
  ADD CONSTRAINT financial_invoices_status_check
  CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'paid'));

DROP TRIGGER IF EXISTS financial_invoices_set_updated_at ON public.financial_invoices;
CREATE TRIGGER financial_invoices_set_updated_at
  BEFORE UPDATE ON public.financial_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_financial_invoices_due_date
  ON public.financial_invoices(project_id, due_date)
  WHERE due_date IS NOT NULL;

-- ─── vendor_bills (supplier / subcontractor payables) ───
CREATE TABLE IF NOT EXISTS public.vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'Unpaid'
    CHECK (status IN ('Unpaid', 'PartiallyPaid', 'Paid')),
  due_date DATE,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT vendor_bills_paid_not_exceed_amount CHECK (paid_amount <= amount)
);

CREATE INDEX IF NOT EXISTS idx_vendor_bills_project_status
  ON public.vendor_bills(project_id, status, due_date);

DROP TRIGGER IF EXISTS vendor_bills_set_updated_at ON public.vendor_bills;
CREATE TRIGGER vendor_bills_set_updated_at
  BEFORE UPDATE ON public.vendor_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Stock valuation support (unit price per inventory item) ───
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS unit_price_rial NUMERIC(18, 2) NOT NULL DEFAULT 0
    CHECK (unit_price_rial >= 0);

-- ─── RLS: financial_invoices — accountant / admin only (no site_supervisor) ───
ALTER TABLE public.financial_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_invoices_select ON public.financial_invoices;
DROP POLICY IF EXISTS financial_invoices_write ON public.financial_invoices;
DROP POLICY IF EXISTS financial_invoices_insert ON public.financial_invoices;
DROP POLICY IF EXISTS financial_invoices_update ON public.financial_invoices;
DROP POLICY IF EXISTS financial_invoices_delete ON public.financial_invoices;

CREATE POLICY financial_invoices_select ON public.financial_invoices
  FOR SELECT USING (public.is_project_accountant(project_id) OR public.is_system_admin());

CREATE POLICY financial_invoices_insert ON public.financial_invoices
  FOR INSERT WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

CREATE POLICY financial_invoices_update ON public.financial_invoices
  FOR UPDATE
  USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

CREATE POLICY financial_invoices_delete ON public.financial_invoices
  FOR DELETE USING (public.is_project_accountant(project_id) OR public.is_system_admin());

-- ─── RLS: vendor_bills — accountant / admin only ───
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_bills_select ON public.vendor_bills;
CREATE POLICY vendor_bills_select ON public.vendor_bills
  FOR SELECT USING (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS vendor_bills_insert ON public.vendor_bills;
CREATE POLICY vendor_bills_insert ON public.vendor_bills
  FOR INSERT WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS vendor_bills_update ON public.vendor_bills;
CREATE POLICY vendor_bills_update ON public.vendor_bills
  FOR UPDATE
  USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS vendor_bills_delete ON public.vendor_bills;
CREATE POLICY vendor_bills_delete ON public.vendor_bills
  FOR DELETE USING (public.is_project_accountant(project_id) OR public.is_system_admin());

-- ─── Seed new accountant UI blocks ───
INSERT INTO public.dashboard_ui_blocks (code, key, kind, dashboard, layer, title_fa, title_en, description_fa, sort_order, default_visible)
VALUES
  ('ACC-ACT-02', 'acc.action.add_invoice', 'action', 'accountant', 'operational', 'ثبت صورت‌وضعیت', 'Add Invoice', 'فرم ثبت صورت‌وضعیت کارفرما', 851, true),
  ('ACC-TBL-03', 'acc.table.vendor_bills', 'table', 'accountant', 'operational', 'بدهی‌ها و ارزش انبار', 'Vendor Bills & Stock', 'vendor_bills و ارزش ریالی انبار', 822, true)
ON CONFLICT (code) DO NOTHING;
