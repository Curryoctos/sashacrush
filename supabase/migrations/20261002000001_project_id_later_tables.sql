-- Ensure project_id exists on tables created after 20260720000005.
-- (suggestions / investments did not exist when that migration first ran.)

ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

CREATE INDEX IF NOT EXISTS suggestions_project_id_idx ON public.suggestions (project_id);
CREATE INDEX IF NOT EXISTS investments_project_id_idx ON public.investments (project_id);

-- Edge functions / integration tests use the service_role client.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_updates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO service_role;
