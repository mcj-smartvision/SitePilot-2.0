-- =====================================================
-- Contractor Payables (بدهی پیمانکاران)
-- Run after migration 40
-- =====================================================
-- Business rule:
--   Expense recognition ≠ cash payment.
--   Approved contractor work creates:
--     1) expense (financial_costs / accounting_documents)
--     2) open payable (vendor_bills) until cash is paid
--   Payment only reduces paid_amount / remaining_amount.
--
-- Extends existing vendor_bills instead of duplicating a parallel table.

-- ─── New columns on vendor_bills ───
ALTER TABLE public.vendor_bills
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payable_type TEXT NOT NULL DEFAULT 'payable',
  ADD COLUMN IF NOT EXISTS related_document_id UUID
    REFERENCES public.accounting_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_document_type TEXT,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- payable_type constraint
ALTER TABLE public.vendor_bills
  DROP CONSTRAINT IF EXISTS vendor_bills_payable_type_check;
ALTER TABLE public.vendor_bills
  ADD CONSTRAINT vendor_bills_payable_type_check
  CHECK (payable_type IN ('payable', 'check_payable', 'accrued_expense'));

-- Migrate legacy statuses → open / partial / settled
UPDATE public.vendor_bills SET status = 'open' WHERE status = 'Unpaid';
UPDATE public.vendor_bills SET status = 'partial' WHERE status = 'PartiallyPaid';
UPDATE public.vendor_bills SET status = 'settled' WHERE status = 'Paid';

ALTER TABLE public.vendor_bills
  DROP CONSTRAINT IF EXISTS vendor_bills_status_check;
ALTER TABLE public.vendor_bills
  ADD CONSTRAINT vendor_bills_status_check
  CHECK (status IN (
    'open', 'partial', 'settled', 'overdue', 'cancelled', 'check_issued',
    -- keep legacy values readable if any row missed migration
    'Unpaid', 'PartiallyPaid', 'Paid'
  ));

-- remaining_amount as generated column (amount - paid_amount)
ALTER TABLE public.vendor_bills
  DROP COLUMN IF EXISTS remaining_amount;
ALTER TABLE public.vendor_bills
  ADD COLUMN remaining_amount NUMERIC(18, 2)
    GENERATED ALWAYS AS (amount - paid_amount) STORED;

CREATE INDEX IF NOT EXISTS idx_vendor_bills_related_document
  ON public.vendor_bills(related_document_id)
  WHERE related_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_bills_due_open
  ON public.vendor_bills(project_id, due_date)
  WHERE status IN ('open', 'partial', 'overdue', 'check_issued', 'Unpaid', 'PartiallyPaid');

-- ─── Auto-status from paid amounts (payment ≠ expense) ───
CREATE OR REPLACE FUNCTION public.sync_vendor_bill_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Soft-cancel / check-issued are manual; do not overwrite
  IF NEW.status IN ('cancelled', 'check_issued') THEN
    RETURN NEW;
  END IF;

  IF NEW.paid_amount <= 0 THEN
    IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    ELSE
      NEW.status := 'open';
    END IF;
  ELSIF NEW.paid_amount < NEW.amount THEN
    IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    ELSE
      NEW.status := 'partial';
    END IF;
  ELSE
    NEW.status := 'settled';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_bills_sync_status ON public.vendor_bills;
CREATE TRIGGER trg_vendor_bills_sync_status
  BEFORE INSERT OR UPDATE OF amount, paid_amount, due_date, status
  ON public.vendor_bills
  FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_bill_status();

-- ─── Payment history (audit of cash outflows against payables) ───
CREATE TABLE IF NOT EXISTS public.contractor_payable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_bill_id UUID NOT NULL REFERENCES public.vendor_bills(id) ON DELETE CASCADE,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'cash'
    CHECK (method IN ('cash', 'transfer', 'check', 'other')),
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_payable_payments_bill
  ON public.contractor_payable_payments(vendor_bill_id, payment_date DESC);

ALTER TABLE public.contractor_payable_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contractor_payable_payments_select ON public.contractor_payable_payments;
CREATE POLICY contractor_payable_payments_select ON public.contractor_payable_payments
  FOR SELECT TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS contractor_payable_payments_insert ON public.contractor_payable_payments;
CREATE POLICY contractor_payable_payments_insert ON public.contractor_payable_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS contractor_payable_payments_delete ON public.contractor_payable_payments;
CREATE POLICY contractor_payable_payments_delete ON public.contractor_payable_payments
  FOR DELETE TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

-- Compatibility view with the name from the product brief
CREATE OR REPLACE VIEW public.contractor_payables AS
SELECT
  id,
  project_id,
  vendor_name AS contractor_name,
  related_document_id AS related_report_id,
  related_document_type,
  payable_type AS type,
  amount,
  paid_amount,
  remaining_amount,
  due_date,
  status,
  description,
  bill_date,
  created_at,
  updated_at,
  created_by
FROM public.vendor_bills;

GRANT SELECT ON public.contractor_payables TO authenticated;
