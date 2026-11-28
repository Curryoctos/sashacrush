-- C-20 Project Suggestion Portal
-- Lifecycle: draft → submitted → under_review → approved | rejected
-- Roles: admin + agent create; admin transitions; executive read; seller blocked.

CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id uuid NOT NULL REFERENCES public.land_records (id) ON DELETE CASCADE,
  submitter_id uuid NOT NULL REFERENCES public.users (id),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX suggestions_land_id_idx ON public.suggestions (land_id);
CREATE INDEX suggestions_submitter_id_idx ON public.suggestions (submitter_id);
CREATE INDEX suggestions_status_idx ON public.suggestions (status);

CREATE TABLE public.suggestion_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.suggestions (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users (id),
  body text NOT NULL,
  status_from text,
  status_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suggestion_comments_body_nonempty CHECK (char_length(btrim(body)) > 0)
);

CREATE INDEX suggestion_comments_suggestion_id_idx
  ON public.suggestion_comments (suggestion_id, created_at);

COMMENT ON TABLE public.suggestions IS
  'C-20 on-site / project suggestions tied to a land record.';
COMMENT ON TABLE public.suggestion_comments IS
  'Status-transition notes and discussion thread on a suggestion.';

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.suggestions TO authenticated;
GRANT SELECT, INSERT ON public.suggestion_comments TO authenticated;

-- ---------------------------------------------------------------------------
-- suggestions RLS
-- ---------------------------------------------------------------------------

CREATE POLICY "suggestions_staff_select"
  ON public.suggestions
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'agent', 'executive'));

CREATE POLICY "suggestions_admin_agent_insert"
  ON public.suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'agent')
    AND submitter_id = auth.uid()
    AND status IN ('draft', 'submitted')
  );

-- Submitter may edit own drafts (title/body) or move draft → submitted.
CREATE POLICY "suggestions_submitter_update_draft"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (
    submitter_id = auth.uid()
    AND public.current_user_role() IN ('admin', 'agent')
    AND status = 'draft'
  )
  WITH CHECK (
    submitter_id = auth.uid()
    AND status IN ('draft', 'submitted')
  );

-- Admin may transition submitted / under_review → next states.
CREATE POLICY "suggestions_admin_update_status"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "suggestions_admin_delete"
  ON public.suggestions
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- suggestion_comments RLS
-- ---------------------------------------------------------------------------

CREATE POLICY "suggestion_comments_staff_select"
  ON public.suggestion_comments
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'agent', 'executive'));

CREATE POLICY "suggestion_comments_staff_insert"
  ON public.suggestion_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'agent')
    AND author_id = auth.uid()
  );

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_suggestions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER suggestions_touch_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_suggestions_updated_at();
