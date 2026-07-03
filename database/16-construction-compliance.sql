-- =====================================================
-- SitePilot Construction Compliance Module
-- Run in Supabase SQL Editor after migration 15
-- Extensible: add regions/standards via INSERT — no schema change required
-- =====================================================

-- -----------------------------------------------------
-- Lookup: regulatory regions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_regulatory_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Lookup: construction types (project categories)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_construction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Master standards registry (AI uses ai_reference_id)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('safety', 'quality', 'environmental', 'bim', 'contract', 'general')),
  ai_reference_id TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_standards_category ON public.compliance_standards(category);
CREATE INDEX IF NOT EXISTS idx_compliance_standards_ai_ref ON public.compliance_standards(ai_reference_id);

-- -----------------------------------------------------
-- Region → default standards (mandatory auto-activation)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_region_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.compliance_regulatory_regions(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES public.compliance_standards(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 100,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (region_id, standard_id)
);

-- -----------------------------------------------------
-- Construction type → additional standards
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_type_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_type_id UUID NOT NULL REFERENCES public.compliance_construction_types(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES public.compliance_standards(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 200,
  UNIQUE (construction_type_id, standard_id)
);

-- -----------------------------------------------------
-- Per-project compliance snapshot (for AI + dashboards)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_compliance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE,
  regulatory_region_key TEXT NOT NULL,
  construction_type_key TEXT NOT NULL,
  additional_standard_keys TEXT[] NOT NULL DEFAULT '{}',
  activated_standards_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_compliance_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_regulatory_note TEXT,
  custom_standard_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_compliance_region ON public.project_compliance_profiles(regulatory_region_key);
CREATE INDEX IF NOT EXISTS idx_project_compliance_type ON public.project_compliance_profiles(construction_type_key);

-- -----------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS compliance_regions_updated ON public.compliance_regulatory_regions;
CREATE TRIGGER compliance_regions_updated
  BEFORE UPDATE ON public.compliance_regulatory_regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS compliance_types_updated ON public.compliance_construction_types;
CREATE TRIGGER compliance_types_updated
  BEFORE UPDATE ON public.compliance_construction_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS compliance_standards_updated ON public.compliance_standards;
CREATE TRIGGER compliance_standards_updated
  BEFORE UPDATE ON public.compliance_standards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS project_compliance_updated ON public.project_compliance_profiles;
CREATE TRIGGER project_compliance_updated
  BEFORE UPDATE ON public.project_compliance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- RLS — read for authenticated; write for admins / service role
-- -----------------------------------------------------
ALTER TABLE public.compliance_regulatory_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_construction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_region_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_type_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_compliance_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compliance_regions_read ON public.compliance_regulatory_regions;
CREATE POLICY compliance_regions_read ON public.compliance_regulatory_regions FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS compliance_types_read ON public.compliance_construction_types;
CREATE POLICY compliance_types_read ON public.compliance_construction_types FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS compliance_standards_read ON public.compliance_standards;
CREATE POLICY compliance_standards_read ON public.compliance_standards FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS compliance_region_standards_read ON public.compliance_region_standards;
CREATE POLICY compliance_region_standards_read ON public.compliance_region_standards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS compliance_type_standards_read ON public.compliance_type_standards;
CREATE POLICY compliance_type_standards_read ON public.compliance_type_standards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS project_compliance_read ON public.project_compliance_profiles;
CREATE POLICY project_compliance_read ON public.project_compliance_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS project_compliance_write ON public.project_compliance_profiles;
CREATE POLICY project_compliance_write ON public.project_compliance_profiles FOR ALL TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

-- -----------------------------------------------------
-- Seed: regulatory regions
-- -----------------------------------------------------
INSERT INTO public.compliance_regulatory_regions (key, name, sort_order) VALUES
  ('germany', 'Germany', 10),
  ('european_union', 'European Union', 20),
  ('united_states', 'United States', 30),
  ('canada', 'Canada', 40),
  ('iran', 'Iran', 50),
  ('international', 'International', 60),
  ('custom', 'Custom', 70)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------
-- Seed: construction types
-- -----------------------------------------------------
INSERT INTO public.compliance_construction_types (key, name, sort_order) VALUES
  ('general_building', 'General Building', 10),
  ('industrial_building', 'Industrial Building', 20),
  ('industrial_plant', 'Industrial Plant', 30),
  ('infrastructure', 'Infrastructure', 40),
  ('bridge', 'Bridge', 50),
  ('tunnel', 'Tunnel', 60),
  ('railway', 'Railway', 70),
  ('utility', 'Utility', 80)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Note: Seed compliance_standards + junction rows via admin tooling or a follow-up seed script.
-- Application catalog in lib/compliance/catalog.ts is the source of truth until synced to DB.
