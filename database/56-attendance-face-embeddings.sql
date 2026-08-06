-- =====================================================
-- Biometric face embeddings (FaceNet-style) for gate ID
-- Run after migration 53 / 55
-- =====================================================

ALTER TABLE public.attendance_enrollments
  ADD COLUMN IF NOT EXISTS face_embedding JSONB,
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS sample_count INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.attendance_enrollments.face_embedding IS
  'L2-normalized FaceNet 128-d descriptor (JSON number array)';
COMMENT ON COLUMN public.attendance_enrollments.embedding_model IS
  'e.g. facenet-128-vladmandic';
COMMENT ON COLUMN public.attendance_enrollments.sample_count IS
  'Number of capture samples averaged into face_embedding';
