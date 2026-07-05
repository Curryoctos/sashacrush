-- Storage upsert during signing inserts a new object row; sellers need INSERT
-- permission on assigned documents with status = 'sent'.

CREATE POLICY "documents_storage_seller_insert_sent"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.current_user_role() = 'seller'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = name
        AND d.assigned_to = auth.uid()
        AND d.status = 'sent'
    )
  );
