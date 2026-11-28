-- Allow uploaders / staff to attach GPS after an immediate photo insert.

GRANT UPDATE ON public.photos TO authenticated;

CREATE POLICY "photos_admin_agent_update"
  ON public.photos
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']))
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "photos_uploader_update_own"
  ON public.photos
  FOR UPDATE
  TO authenticated
  USING (uploader_id = auth.uid())
  WITH CHECK (uploader_id = auth.uid());
