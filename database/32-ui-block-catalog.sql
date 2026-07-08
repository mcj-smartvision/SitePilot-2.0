-- Unified UI block catalog for role dashboard visibility (tables, charts, panels, requests)
-- Run after migration 31. Extends legacy dashboard_widgets pattern.

CREATE TABLE IF NOT EXISTS public.dashboard_ui_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('widget', 'kpi', 'chart', 'table', 'panel', 'action', 'request')),
  dashboard TEXT NOT NULL,
  layer TEXT NOT NULL DEFAULT 'general'
    CHECK (layer IN ('executive', 'analytical', 'operational', 'general')),
  title_fa TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  description_fa TEXT NOT NULL DEFAULT '',
  legacy_widget_key TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  default_visible BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.position_ui_block_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.dashboard_ui_blocks(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 100,
  UNIQUE (position_id, block_id)
);

CREATE INDEX IF NOT EXISTS idx_ui_blocks_dashboard ON public.dashboard_ui_blocks(dashboard, sort_order);
CREATE INDEX IF NOT EXISTS idx_position_ui_blocks_position ON public.position_ui_block_visibility(position_id);

ALTER TABLE public.dashboard_ui_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_ui_block_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_ui_blocks_select ON public.dashboard_ui_blocks;
CREATE POLICY dashboard_ui_blocks_select ON public.dashboard_ui_blocks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS dashboard_ui_blocks_admin ON public.dashboard_ui_blocks;
CREATE POLICY dashboard_ui_blocks_admin ON public.dashboard_ui_blocks
  FOR ALL USING (public.is_system_admin());

DROP POLICY IF EXISTS position_ui_blocks_admin ON public.position_ui_block_visibility;
CREATE POLICY position_ui_blocks_admin ON public.position_ui_block_visibility
  FOR ALL USING (public.is_system_admin());

DROP POLICY IF EXISTS position_ui_blocks_member_select ON public.position_ui_block_visibility;
CREATE POLICY position_ui_blocks_member_select ON public.position_ui_block_visibility
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.positions pos ON pos.id = position_ui_block_visibility.position_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = pos.project_id
    ) OR public.is_system_admin()
  );

-- Seed: run database/33-seed-ui-blocks.sql (or: npm run generate:ui-blocks-sql)
