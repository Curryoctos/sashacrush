-- =============================================================================
-- Project updates — progress / news feed for investors and followers
-- =============================================================================

CREATE TABLE public.project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users (id),
  title text NOT NULL,
  body text NOT NULL,
  update_type text NOT NULL DEFAULT 'general' CHECK (
    update_type IN (
      'general',
      'milestone',
      'funding',
      'photo',
      'document',
      'shipment',
      'completion'
    )
  ),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_updates_title_nonempty CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT project_updates_body_nonempty CHECK (char_length(btrim(body)) > 0)
);

CREATE INDEX project_updates_project_id_created_at_idx
  ON public.project_updates (project_id, created_at DESC);

COMMENT ON TABLE public.project_updates IS
  'Progress updates posted by admin/agents — the project news feed.';

CREATE OR REPLACE FUNCTION public.can_read_project_content(p_project_id uuid, p_is_public boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN public.current_user_role() IN ('admin', 'executive', 'agent') THEN true
      WHEN public.is_project_participant(p_project_id) THEN true
      WHEN p_is_public AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = p_project_id
          AND p.visibility = 'public'
      ) THEN true
      ELSE false
    END;
$$;

ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_updates TO anon, authenticated;
GRANT INSERT, UPDATE ON public.project_updates TO authenticated;

-- Public updates on public projects: anyone
CREATE POLICY "project_updates_public_select"
  ON public.project_updates
  FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND p.visibility = 'public'
    )
  );

-- Private updates / private projects: staff + participants
CREATE POLICY "project_updates_restricted_select"
  ON public.project_updates
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'executive', 'agent')
    OR public.is_project_participant(project_id)
  );

-- Admin and agent: insert / update
CREATE POLICY "project_updates_staff_insert"
  ON public.project_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'agent'));

CREATE POLICY "project_updates_staff_update"
  ON public.project_updates
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'agent'))
  WITH CHECK (public.current_user_role() IN ('admin', 'agent'));
