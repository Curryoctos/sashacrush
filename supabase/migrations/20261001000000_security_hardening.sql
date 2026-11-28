-- C-30 security hardening:
-- 1. Photo GPS immutable after insert (BR-07)
-- 2. Signed document storage objects cannot be overwritten/deleted (BR-04)
-- 3. Cargo document MIME allowlist at DB layer

-- ── 1. Photos: GPS + accuracy frozen after insert ────────────
CREATE OR REPLACE FUNCTION public.trg_photos_gps_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitude IS DISTINCT FROM OLD.latitude
     OR NEW.longitude IS DISTINCT FROM OLD.longitude
     OR NEW.accuracy_m IS DISTINCT FROM OLD.accuracy_m THEN
    RAISE EXCEPTION 'Photo GPS is immutable after upload'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS photos_gps_immutable ON public.photos;
CREATE TRIGGER photos_gps_immutable
  BEFORE UPDATE ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_photos_gps_immutable();

COMMENT ON FUNCTION public.trg_photos_gps_immutable() IS
  'BR-07: latitude/longitude/accuracy_m are write-once at insert; never editable after upload.';

-- ── 2. Documents storage: split ALL; block signed overwrite ─
DROP POLICY IF EXISTS "documents_storage_admin_agent_all" ON storage.objects;

CREATE POLICY "documents_storage_admin_agent_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['admin', 'agent'])
  );

CREATE POLICY "documents_storage_admin_agent_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['admin', 'agent'])
  );

CREATE POLICY "documents_storage_admin_agent_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['admin', 'agent'])
    AND NOT EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = name
        AND d.status = 'signed'
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['admin', 'agent'])
    AND NOT EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = name
        AND d.status = 'signed'
    )
  );

CREATE POLICY "documents_storage_admin_agent_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['admin', 'agent'])
    AND NOT EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = name
        AND d.status = 'signed'
    )
  );

-- Seller/executive write already gated to status = 'sent'; tighten DELETE the same way.
DROP POLICY IF EXISTS "documents_storage_seller_delete_sent" ON storage.objects;
CREATE POLICY "documents_storage_seller_delete_sent"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
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

-- ── 3. Cargo MIME allowlist (server-side) ────────────────────
ALTER TABLE public.cargo_documents
  DROP CONSTRAINT IF EXISTS cargo_documents_mime_type_allowed;

ALTER TABLE public.cargo_documents
  ADD CONSTRAINT cargo_documents_mime_type_allowed
  CHECK (
    mime_type IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  );
