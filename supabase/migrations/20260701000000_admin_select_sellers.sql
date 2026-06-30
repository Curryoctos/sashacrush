-- Allow admin to read seller profiles for land record assignment dropdowns.
CREATE POLICY "users_admin_select_sellers"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(ARRAY['admin'])
    AND role = 'seller'
  );
