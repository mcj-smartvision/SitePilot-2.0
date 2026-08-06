-- =====================================================
-- REQUIRED for guided biometric enroll (run in Supabase SQL editor)
-- Safe to re-run (IF NOT EXISTS)
-- =====================================================

ALTER TABLE public.attendance_enrollments
  ADD COLUMN IF NOT EXISTS face_embedding JSONB,
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS sample_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sample_images JSONB NOT NULL DEFAULT '[]'::jsonb;
