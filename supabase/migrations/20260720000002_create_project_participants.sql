-- =============================================================================
-- Project participants — membership + roles per project
-- =============================================================================

CREATE TABLE public.project_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id),
  role text NOT NULL CHECK (
    role IN (
      'investor',
      'contributor',
      'counterpart',
      'follower',
      'collaborator'
    )
  ),
  invited_by uuid REFERENCES public.users (id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE (project_id, user_id)
);

CREATE INDEX project_participants_project_id_idx
  ON public.project_participants (project_id);
CREATE INDEX project_participants_user_id_idx
  ON public.project_participants (user_id);

COMMENT ON TABLE public.project_participants IS
  'Links users to projects with a per-project role (investor, follower, etc.).';

-- SECURITY DEFINER helpers for RLS (break projects ↔ participants cycles)
CREATE OR REPLACE FUNCTION public.is_project_participant(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_participants
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_project_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_participants me
    INNER JOIN public.project_participants other
      ON other.project_id = me.project_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = p_user_id
  );
$$;

ALTER TABLE public.project_participants ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_participants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_participants TO authenticated;

-- Admin and executive: read all
CREATE POLICY "project_participants_staff_select"
  ON public.project_participants
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'executive'));

-- Own memberships
CREATE POLICY "project_participants_self_select"
  ON public.project_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Co-participants on the same project
CREATE POLICY "project_participants_peer_select"
  ON public.project_participants
  FOR SELECT
  TO authenticated
  USING (public.is_project_participant(project_id));

-- Admin only: write
CREATE POLICY "project_participants_admin_insert"
  ON public.project_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "project_participants_admin_update"
  ON public.project_participants
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "project_participants_admin_delete"
  ON public.project_participants
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Private projects readable by participants
CREATE POLICY "projects_participant_select_private"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'private'
    AND public.is_project_participant(id)
  );
