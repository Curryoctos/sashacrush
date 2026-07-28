-- Documents: assignment, signing metadata, storage bucket, updated RLS

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.users (id),
  ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES public.users (id);

DROP POLICY IF EXISTS "documents_seller_select_own_land" ON public.documents;
DROP POLICY IF EXISTS "documents_seller_update_own_land" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_agent_update" ON public.documents;

CREATE POLICY "documents_seller_select_assigned"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND assigned_to = auth.uid()
  );

CREATE POLICY "documents_seller_sign"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND assigned_to = auth.uid()
    AND status = 'sent'
  )
  WITH CHECK (
    public.current_user_role() = 'seller'
    AND assigned_to = auth.uid()
    AND status = 'signed'
  );

CREATE POLICY "documents_admin_agent_update"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(ARRAY['admin', 'agent'])
    AND status <> 'signed'
  )
  WITH CHECK (
    public.has_role(ARRAY['admin', 'agent'])
    AND status <> 'signed'
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "documents_storage_admin_agent_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['admin', 'agent'])
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['admin', 'agent'])
  );

CREATE POLICY "documents_storage_seller_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.current_user_role() = 'seller'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.assigned_to = auth.uid()
    )
  );

CREATE POLICY "documents_storage_seller_write_sent"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.current_user_role() = 'seller'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.assigned_to = auth.uid()
        AND d.status = 'sent'
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.current_user_role() = 'seller'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.assigned_to = auth.uid()
        AND d.status = 'sent'
    )
  );
