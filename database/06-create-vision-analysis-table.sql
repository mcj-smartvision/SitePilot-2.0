-- =====================================================
-- جدول VisionAnalysis (تحلیل‌های هوش مصنوعی)
-- =====================================================
-- نتایج تحلیل تصاویر توسط OpenAI Vision API

CREATE TABLE IF NOT EXISTS public.vision_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_storage_path VARCHAR(500),
  analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('progress', 'safety', 'inventory', 'general')),
  detected_objects TEXT[] DEFAULT ARRAY[]::TEXT[],
  safety_issues TEXT,
  safety_severity VARCHAR(50) CHECK (safety_severity IN ('low', 'medium', 'high', 'critical')),
  progress_estimate_percentage INTEGER CHECK (progress_estimate_percentage >= 0 AND progress_estimate_percentage <= 100),
  inventory_detected TEXT,
  raw_analysis TEXT,
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_status VARCHAR(50) DEFAULT 'completed' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ایندکس‌ها
CREATE INDEX idx_vision_analysis_project ON public.vision_analysis(project_id);
CREATE INDEX idx_vision_analysis_type ON public.vision_analysis(analysis_type);
CREATE INDEX idx_vision_analysis_severity ON public.vision_analysis(safety_severity);
CREATE INDEX idx_vision_analysis_date ON public.vision_analysis(created_at);

-- RLS
ALTER TABLE public.vision_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read vision analysis of their projects" ON public.vision_analysis
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        auth.uid()::text = project_manager_id::text OR
        auth.uid()::text = site_supervisor_id::text OR
        auth.uid()::text = hse_officer_id::text
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );
