-- =============================================================================
-- Project milestones — discrete trackable phases
-- =============================================================================

CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'blocked')
  ),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_milestones_title_nonempty CHECK (char_length(btrim(title)) > 0)
);

CREATE INDEX project_milestones_project_id_order_idx
  ON public.project_milestones (project_id, order_index);

COMMENT ON TABLE public.project_milestones IS
  'Trackable project phases with completion criteria and display order.';

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.project_milestones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;

-- Same read pattern as project_updates: public content on public projects
CREATE POLICY "project_milestones_public_select"
  ON public.project_milestones
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND p.visibility = 'public'
    )
  );

CREATE POLICY "project_milestones_restricted_select"
  ON public.project_milestones
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'executive', 'agent')
    OR public.is_project_participant(project_id)
  );

-- Admin only: write
CREATE POLICY "project_milestones_admin_insert"
  ON public.project_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "project_milestones_admin_update"
  ON public.project_milestones
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "project_milestones_admin_delete"
  ON public.project_milestones
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');
