-- Procurement workflow status on PM-approved purchase requests
-- Run after migration 29

ALTER TABLE public.ai_actions
  ADD COLUMN IF NOT EXISTS procurement_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (procurement_status IN (
      'not_applicable',
      'pending',
      'sourcing',
      'rfq_sent',
      'po_issued',
      'in_transit',
      'received',
      'cancelled'
    ));

-- PM-approved purchase requests enter procurement queue
UPDATE public.ai_actions
SET procurement_status = 'pending'
WHERE type = 'purchase_request'
  AND pm_status = 'approved'
  AND procurement_status = 'not_applicable';

CREATE INDEX IF NOT EXISTS idx_ai_actions_procurement
  ON public.ai_actions(project_id, procurement_status, type)
  WHERE type = 'purchase_request';
