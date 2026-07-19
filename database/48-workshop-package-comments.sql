-- =====================================================
-- Workshop package discussion comments (editable by author)
-- Run after migration 47
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workshop_package_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.workshop_packages(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workshop_pkg_comments_package
  ON public.workshop_package_comments(package_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_workshop_pkg_comments_project
  ON public.workshop_package_comments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_pkg_comments_author
  ON public.workshop_package_comments(author_id, updated_at DESC);

ALTER TABLE public.workshop_package_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workshop_package_comments_select ON public.workshop_package_comments;
CREATE POLICY workshop_package_comments_select ON public.workshop_package_comments
  FOR SELECT TO authenticated
  USING (public.is_system_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS workshop_package_comments_insert ON public.workshop_package_comments;
CREATE POLICY workshop_package_comments_insert ON public.workshop_package_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_system_admin() OR public.is_project_member(project_id))
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS workshop_package_comments_update ON public.workshop_package_comments;
CREATE POLICY workshop_package_comments_update ON public.workshop_package_comments
  FOR UPDATE TO authenticated
  USING (
    public.is_system_admin()
    OR (public.is_project_member(project_id) AND author_id = auth.uid())
  )
  WITH CHECK (
    public.is_system_admin()
    OR (public.is_project_member(project_id) AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS workshop_package_comments_delete ON public.workshop_package_comments;
CREATE POLICY workshop_package_comments_delete ON public.workshop_package_comments
  FOR DELETE TO authenticated
  USING (
    public.is_system_admin()
    OR (public.is_project_member(project_id) AND author_id = auth.uid())
  );
