-- Admin user management: active flag + admin may list all portal users.
-- Mutations (create / role / deactivate) stay on service-role edge functions.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS users_role_active_idx
  ON public.users (role, is_active);

-- Replace seller-only admin select with full admin directory access.
DROP POLICY IF EXISTS "users_admin_select_sellers" ON public.users;

CREATE POLICY "users_admin_select_all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin']));

-- Keep agents able to resolve seller labels on land records they can see.
CREATE POLICY "users_agent_select_sellers"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(ARRAY['agent'])
    AND role = 'seller'
  );
