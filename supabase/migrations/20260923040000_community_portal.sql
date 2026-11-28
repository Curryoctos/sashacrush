-- C-23 Pipeline Community Management
-- Separate namespace from land-deal portals. Public read; community/admin write.

ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'executive'::text, 'agent'::text, 'seller'::text, 'community'::text]));

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  location text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_members_display_name_nonempty CHECK (char_length(btrim(display_name)) > 0)
);

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.community_posts (id) ON DELETE CASCADE,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_body_nonempty CHECK (char_length(btrim(body)) > 0)
);

CREATE INDEX community_posts_parent_id_idx ON public.community_posts (parent_id, created_at);
CREATE INDEX community_posts_pinned_idx ON public.community_posts (is_pinned DESC, created_at DESC)
  WHERE parent_id IS NULL;

CREATE TABLE public.incubation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  created_by uuid REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incubation_events_title_nonempty CHECK (char_length(btrim(title)) > 0)
);

CREATE INDEX incubation_events_starts_at_idx ON public.incubation_events (starts_at);

COMMENT ON TABLE public.community_members IS 'C-23 incubation community profiles (role=community).';
COMMENT ON TABLE public.community_posts IS 'C-23 public board posts and replies.';
COMMENT ON TABLE public.incubation_events IS 'C-23 upcoming incubation schedule (public read).';

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incubation_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.community_members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.community_members TO authenticated;

GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;

GRANT SELECT ON public.incubation_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incubation_events TO authenticated;

-- Members: public read; self insert/update; admin all
CREATE POLICY "community_members_public_select"
  ON public.community_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "community_members_self_insert"
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_role() = 'community'
  );

CREATE POLICY "community_members_self_update"
  ON public.community_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() = 'admin');

-- Posts: public read; community/admin insert; author update body; admin pin/delete
CREATE POLICY "community_posts_public_select"
  ON public.community_posts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "community_posts_member_insert"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND public.current_user_role() IN ('community', 'admin')
    AND is_pinned = false
  );

CREATE POLICY "community_posts_author_update"
  ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (
    author_user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    author_user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

CREATE POLICY "community_posts_admin_delete"
  ON public.community_posts
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Schedule: public read; admin write
CREATE POLICY "incubation_events_public_select"
  ON public.incubation_events
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "incubation_events_admin_write"
  ON public.incubation_events
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
