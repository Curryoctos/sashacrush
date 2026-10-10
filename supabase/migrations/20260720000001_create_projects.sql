-- =============================================================================
-- Projects — central entity for community funding / investment platform
-- Note: FK target is public.users (app identity table; no public.profiles).
-- Chronology: filename 20260720 places this after initial schema helpers.
-- =============================================================================

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  cause text,
  type text NOT NULL CHECK (
    type IN (
      'land_acquisition',
      'infrastructure',
      'community_cause',
      'cargo_import',
      'investment',
      'agriculture',
      'education',
      'sports',
      'other'
    )
  ),
  created_by uuid REFERENCES public.users (id),
  owner_id uuid REFERENCES public.users (id),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  funding_goal_usd numeric,
  funding_raised_usd numeric NOT NULL DEFAULT 0,
  min_contribution_usd numeric NOT NULL DEFAULT 10,
  location_name text,
  country text NOT NULL DEFAULT 'Uganda',
  latitude numeric,
  longitude numeric,
  boundary_geojson jsonb,
  start_date date,
  target_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'active',
      'funded',
      'in_progress',
      'completed',
      'on_hold',
      'cancelled'
    )
  ),
  cover_image_path text,
  tags text[] NOT NULL DEFAULT '{}',
  external_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_title_nonempty CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT projects_slug_nonempty CHECK (char_length(btrim(slug)) > 0),
  CONSTRAINT projects_description_nonempty CHECK (char_length(btrim(description)) > 0)
);

CREATE INDEX projects_type_idx ON public.projects (type);
CREATE INDEX projects_status_idx ON public.projects (status);
CREATE INDEX projects_visibility_idx ON public.projects (visibility);
CREATE INDEX projects_owner_id_idx ON public.projects (owner_id);
CREATE INDEX projects_created_at_desc_idx ON public.projects (created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_projects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_touch_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_projects_updated_at();

COMMENT ON TABLE public.projects IS
  'Central funding entity — land, schools, cargo, agriculture, and other community projects.';

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;

-- Public projects: readable by anyone (anon + authenticated)
CREATE POLICY "projects_public_select"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public');

-- Admin and executive: read all rows (including private)
CREATE POLICY "projects_staff_select"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'executive'));

-- Participant read of private projects is added in project_participants migration
-- once the membership table exists (avoids forward FK dependency).

-- Admin only: write
CREATE POLICY "projects_admin_insert"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "projects_admin_update"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "projects_admin_delete"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'admin');
