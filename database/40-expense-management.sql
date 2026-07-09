-- =====================================================
-- Expense Management / Accounting Documents
-- Run after migration 39
-- =====================================================
-- Professional document lifecycle:
--   draft → submitted → finalized
--   finalized → corrected | cancelled | reversed
-- Finalized documents are locked (no direct field edits).
-- Never hard-delete finalized rows; use status transitions.

-- ─── expense_categories ───
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name_fa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  cost_type TEXT NOT NULL DEFAULT 'materials'
    CHECK (cost_type IN ('materials', 'labor', 'equipment', 'subcontractor', 'overhead')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, key)
);

-- Global (project_id IS NULL) seed categories — one row per key
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_categories_global_key
  ON public.expense_categories (key)
  WHERE project_id IS NULL;

INSERT INTO public.expense_categories (project_id, key, name_fa, name_en, cost_type, sort_order)
SELECT NULL, v.key, v.name_fa, v.name_en, v.cost_type, v.sort_order
FROM (
  VALUES
    ('cement', 'سیمان', 'Cement', 'materials', 10),
    ('plaster', 'گچ / پلاستر', 'Plaster', 'materials', 20),
    ('steel', 'آهن‌آلات', 'Steel', 'materials', 30),
    ('aggregate', 'شن و ماسه', 'Aggregate', 'materials', 40),
    ('labor', 'دستمزد', 'Labor', 'labor', 50),
    ('equipment', 'اجاره تجهیزات', 'Equipment Rental', 'equipment', 60),
    ('subcontractor', 'پیمانکار جزء', 'Subcontractor', 'subcontractor', 70),
    ('transport', 'حمل‌ونقل', 'Transport', 'overhead', 80),
    ('utilities', 'آب / برق / گاز', 'Utilities', 'overhead', 90),
    ('other', 'سایر', 'Other', 'overhead', 100)
) AS v(key, name_fa, name_en, cost_type, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.expense_categories ec
  WHERE ec.project_id IS NULL AND ec.key = v.key
);

-- ─── accounting_documents ───
CREATE TABLE IF NOT EXISTS public.accounting_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  document_no TEXT,
  invoice_no TEXT,
  supplier_name TEXT,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description TEXT NOT NULL DEFAULT '',
  cost_type TEXT NOT NULL DEFAULT 'materials'
    CHECK (cost_type IN ('materials', 'labor', 'equipment', 'subcontractor', 'overhead')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'finalized', 'corrected', 'cancelled', 'reversed')),
  -- Correction / reversal linkage (never overwrite the original)
  correction_of_document_id UUID REFERENCES public.accounting_documents(id) ON DELETE SET NULL,
  reversal_of_document_id UUID REFERENCES public.accounting_documents(id) ON DELETE SET NULL,
  -- Soft-delete / lifecycle timestamps
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancel_reason TEXT,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reverse_reason TEXT,
  -- Duplicate handling (soft cancel of duplicates)
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  duplicate_of_document_id UUID REFERENCES public.accounting_documents(id) ON DELETE SET NULL,
  duplicate_reason TEXT,
  -- Optional sync to legacy financial_costs for dashboard AC KPI
  synced_cost_id UUID REFERENCES public.financial_costs(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_documents_project_status
  ON public.accounting_documents(project_id, status, document_date DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_documents_project_date
  ON public.accounting_documents(project_id, document_date DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_documents_supplier
  ON public.accounting_documents(project_id, supplier_name);

CREATE INDEX IF NOT EXISTS idx_accounting_documents_invoice
  ON public.accounting_documents(project_id, invoice_no);

-- Active document numbers must be unique per project (cancelled/reversed may reuse)
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounting_documents_active_doc_no
  ON public.accounting_documents (project_id, document_no)
  WHERE document_no IS NOT NULL
    AND status NOT IN ('cancelled', 'reversed');

-- ─── expense_items (line items under a document) ───
CREATE TABLE IF NOT EXISTS public.expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.accounting_documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  line_no INT NOT NULL DEFAULT 1,
  item_code TEXT,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT,
  unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  cost_type TEXT NOT NULL DEFAULT 'materials'
    CHECK (cost_type IN ('materials', 'labor', 'equipment', 'subcontractor', 'overhead')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_items_document
  ON public.expense_items(document_id, line_no);

CREATE INDEX IF NOT EXISTS idx_expense_items_project
  ON public.expense_items(project_id, created_at DESC);

-- ─── accounting_document_revisions (immutable audit of field changes) ───
CREATE TABLE IF NOT EXISTS public.accounting_document_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.accounting_documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revision_no INT NOT NULL DEFAULT 1,
  action TEXT NOT NULL
    CHECK (action IN (
      'create', 'update', 'submit', 'finalize', 'correct',
      'cancel', 'reverse', 'mark_duplicate', 'import'
    )),
  previous_status TEXT,
  new_status TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_doc_revisions_document
  ON public.accounting_document_revisions(document_id, revision_no DESC);

-- ─── document_files (uploads + generated exports) ───
CREATE TABLE IF NOT EXISTS public.document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.accounting_documents(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'accounting-documents',
  kind TEXT NOT NULL DEFAULT 'attachment'
    CHECK (kind IN ('attachment', 'export_pdf', 'export_csv', 'export_excel', 'import_source')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_files_document
  ON public.document_files(document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_files_project
  ON public.document_files(project_id, created_at DESC);

-- ─── finance_audit_logs (app-writable; profiles-based) ───
CREATE TABLE IF NOT EXISTS public.finance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_audit_logs_entity
  ON public.finance_audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_audit_logs_project
  ON public.finance_audit_logs(project_id, created_at DESC);

-- ─── updated_at helper ───
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounting_documents_updated_at ON public.accounting_documents;
CREATE TRIGGER trg_accounting_documents_updated_at
  BEFORE UPDATE ON public.accounting_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_expense_items_updated_at ON public.expense_items;
CREATE TRIGGER trg_expense_items_updated_at
  BEFORE UPDATE ON public.expense_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Lock finalized documents (direct field edits blocked) ───
-- Allowed: status lifecycle transitions + audit metadata fields.
CREATE OR REPLACE FUNCTION public.enforce_accounting_document_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  locked BOOLEAN;
BEGIN
  locked := OLD.status IN ('finalized', 'corrected', 'cancelled', 'reversed', 'submitted');

  IF NOT locked THEN
    RETURN NEW;
  END IF;

  -- Status-only / lifecycle metadata changes are allowed
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.finalized_at IS DISTINCT FROM OLD.finalized_at
     OR NEW.finalized_by IS DISTINCT FROM OLD.finalized_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
     OR NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason
     OR NEW.reversed_at IS DISTINCT FROM OLD.reversed_at
     OR NEW.reversed_by IS DISTINCT FROM OLD.reversed_by
     OR NEW.reverse_reason IS DISTINCT FROM OLD.reverse_reason
     OR NEW.is_duplicate IS DISTINCT FROM OLD.is_duplicate
     OR NEW.duplicate_of_document_id IS DISTINCT FROM OLD.duplicate_of_document_id
     OR NEW.duplicate_reason IS DISTINCT FROM OLD.duplicate_reason
     OR NEW.synced_cost_id IS DISTINCT FROM OLD.synced_cost_id
     OR NEW.updated_by IS DISTINCT FROM OLD.updated_by
     OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
  THEN
    -- Ensure financial payload fields were not altered during lifecycle update
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.document_no IS DISTINCT FROM OLD.document_no
       OR NEW.invoice_no IS DISTINCT FROM OLD.invoice_no
       OR NEW.supplier_name IS DISTINCT FROM OLD.supplier_name
       OR NEW.document_date IS DISTINCT FROM OLD.document_date
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.cost_type IS DISTINCT FROM OLD.cost_type
       OR NEW.category_id IS DISTINCT FROM OLD.category_id
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.correction_of_document_id IS DISTINCT FROM OLD.correction_of_document_id
       OR NEW.reversal_of_document_id IS DISTINCT FROM OLD.reversal_of_document_id
    THEN
      RAISE EXCEPTION 'Locked accounting document cannot change financial fields. Use correction/reversal/cancellation.';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Accounting document is locked (status=%). Create a correction, reversal, or cancellation instead.', OLD.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounting_documents_lock ON public.accounting_documents;
CREATE TRIGGER trg_accounting_documents_lock
  BEFORE UPDATE ON public.accounting_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_accounting_document_lock();

-- Block hard-delete of non-draft documents
CREATE OR REPLACE FUNCTION public.enforce_accounting_document_no_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'Cannot hard-delete accounting document with status=%; cancel or reverse instead.', OLD.status;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounting_documents_no_hard_delete ON public.accounting_documents;
CREATE TRIGGER trg_accounting_documents_no_hard_delete
  BEFORE DELETE ON public.accounting_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_accounting_document_no_hard_delete();

-- Lock expense_items when parent document is not draft
CREATE OR REPLACE FUNCTION public.enforce_expense_item_parent_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status TEXT;
  doc_id UUID;
BEGIN
  doc_id := COALESCE(NEW.document_id, OLD.document_id);
  SELECT status INTO parent_status
  FROM public.accounting_documents
  WHERE id = doc_id;

  IF parent_status IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF parent_status <> 'draft' THEN
    RAISE EXCEPTION 'Expense items are locked because parent document status is %.', parent_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_items_parent_lock_ins ON public.expense_items;
CREATE TRIGGER trg_expense_items_parent_lock_ins
  BEFORE INSERT ON public.expense_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_expense_item_parent_lock();

DROP TRIGGER IF EXISTS trg_expense_items_parent_lock_upd ON public.expense_items;
CREATE TRIGGER trg_expense_items_parent_lock_upd
  BEFORE UPDATE ON public.expense_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_expense_item_parent_lock();

DROP TRIGGER IF EXISTS trg_expense_items_parent_lock_del ON public.expense_items;
CREATE TRIGGER trg_expense_items_parent_lock_del
  BEFORE DELETE ON public.expense_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_expense_item_parent_lock();

-- ─── Storage bucket ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('accounting-documents', 'accounting-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS accounting_documents_storage_select ON storage.objects;
CREATE POLICY accounting_documents_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'accounting-documents');

DROP POLICY IF EXISTS accounting_documents_storage_insert ON storage.objects;
CREATE POLICY accounting_documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accounting-documents');

DROP POLICY IF EXISTS accounting_documents_storage_update ON storage.objects;
CREATE POLICY accounting_documents_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'accounting-documents');

DROP POLICY IF EXISTS accounting_documents_storage_delete ON storage.objects;
CREATE POLICY accounting_documents_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'accounting-documents');

-- ─── RLS ───
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Categories: members read; accountant write (project-scoped); global readable by all authenticated
DROP POLICY IF EXISTS expense_categories_select ON public.expense_categories;
CREATE POLICY expense_categories_select ON public.expense_categories
  FOR SELECT TO authenticated
  USING (
    project_id IS NULL
    OR public.is_project_member(project_id)
    OR public.is_system_admin()
  );

DROP POLICY IF EXISTS expense_categories_write ON public.expense_categories;
CREATE POLICY expense_categories_write ON public.expense_categories
  FOR ALL TO authenticated
  USING (
    project_id IS NOT NULL
    AND (public.is_project_accountant(project_id) OR public.is_system_admin())
  )
  WITH CHECK (
    project_id IS NOT NULL
    AND (public.is_project_accountant(project_id) OR public.is_system_admin())
  );

-- Documents: accountant/admin only (sensitive financial data)
DROP POLICY IF EXISTS accounting_documents_select ON public.accounting_documents;
CREATE POLICY accounting_documents_select ON public.accounting_documents
  FOR SELECT TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS accounting_documents_insert ON public.accounting_documents;
CREATE POLICY accounting_documents_insert ON public.accounting_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS accounting_documents_update ON public.accounting_documents;
CREATE POLICY accounting_documents_update ON public.accounting_documents
  FOR UPDATE TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS accounting_documents_delete ON public.accounting_documents;
CREATE POLICY accounting_documents_delete ON public.accounting_documents
  FOR DELETE TO authenticated
  USING (
    (public.is_project_accountant(project_id) OR public.is_system_admin())
    AND status = 'draft'
  );

-- Expense items
DROP POLICY IF EXISTS expense_items_select ON public.expense_items;
CREATE POLICY expense_items_select ON public.expense_items
  FOR SELECT TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS expense_items_insert ON public.expense_items;
CREATE POLICY expense_items_insert ON public.expense_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS expense_items_update ON public.expense_items;
CREATE POLICY expense_items_update ON public.expense_items
  FOR UPDATE TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS expense_items_delete ON public.expense_items;
CREATE POLICY expense_items_delete ON public.expense_items
  FOR DELETE TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

-- Revisions (append-only for accountants)
DROP POLICY IF EXISTS accounting_document_revisions_select ON public.accounting_document_revisions;
CREATE POLICY accounting_document_revisions_select ON public.accounting_document_revisions
  FOR SELECT TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS accounting_document_revisions_insert ON public.accounting_document_revisions;
CREATE POLICY accounting_document_revisions_insert ON public.accounting_document_revisions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

-- Document files
DROP POLICY IF EXISTS document_files_select ON public.document_files;
CREATE POLICY document_files_select ON public.document_files
  FOR SELECT TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS document_files_insert ON public.document_files;
CREATE POLICY document_files_insert ON public.document_files
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_accountant(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS document_files_delete ON public.document_files;
CREATE POLICY document_files_delete ON public.document_files
  FOR DELETE TO authenticated
  USING (public.is_project_accountant(project_id) OR public.is_system_admin());

-- Finance audit logs
DROP POLICY IF EXISTS finance_audit_logs_select ON public.finance_audit_logs;
CREATE POLICY finance_audit_logs_select ON public.finance_audit_logs
  FOR SELECT TO authenticated
  USING (
    project_id IS NOT NULL
    AND (public.is_project_accountant(project_id) OR public.is_system_admin())
  );

DROP POLICY IF EXISTS finance_audit_logs_insert ON public.finance_audit_logs;
CREATE POLICY finance_audit_logs_insert ON public.finance_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IS NOT NULL
    AND (public.is_project_accountant(project_id) OR public.is_system_admin())
  );
