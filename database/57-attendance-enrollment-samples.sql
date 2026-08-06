-- =====================================================
-- Guided multi-pose face enrollment samples
-- Run after migration 56
-- =====================================================

ALTER TABLE public.attendance_enrollments
  ADD COLUMN IF NOT EXISTS sample_images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.attendance_enrollments.sample_images IS
  'Array of {id, path, pose, embedding[]} — pose-guided enrollment crops';
