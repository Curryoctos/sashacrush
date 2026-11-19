-- Investor agreements: company-capital docs shared between admin and executives.
-- Deal documents stay land-scoped; investor docs use investor_id instead.

ALTER TABLE public.documents
  ALTER COLUMN land_id DROP NOT NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS investor_id uuid REFERENCES public.users (id),
  ADD COLUMN IF NOT EXISTS investment_id uuid REFERENCES public.investments (id) ON DELETE SET NULL;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_scope_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_scope_check CHECK (
    (land_id IS NOT NULL AND investor_id IS NULL)
    OR (land_id IS NULL AND investor_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS documents_investor_id_idx ON public.documents (investor_id);
CREATE INDEX IF NOT EXISTS documents_investment_id_idx ON public.documents (investment_id);

-- Executive assignee policies (mirror seller assigned-doc access)

CREATE POLICY "documents_executive_select_assigned"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'executive'
    AND assigned_to = auth.uid()
  );

CREATE POLICY "documents_executive_sign"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'executive'
    AND assigned_to = auth.uid()
    AND status = 'sent'
  )
  WITH CHECK (
    public.current_user_role() = 'executive'
    AND assigned_to = auth.uid()
    AND status = 'signed'
  );

CREATE POLICY "documents_storage_executive_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.current_user_role() = 'executive'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.assigned_to = auth.uid()
    )
  );

CREATE POLICY "documents_storage_executive_write_sent"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.current_user_role() = 'executive'
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
    AND public.current_user_role() = 'executive'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.assigned_to = auth.uid()
        AND d.status = 'sent'
    )
  );

CREATE POLICY "documents_storage_executive_insert_sent"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.current_user_role() = 'executive'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.assigned_to = auth.uid()
        AND d.status = 'sent'
    )
  );

-- In-app notify: deep-link sellers vs executives by assignee role

CREATE OR REPLACE FUNCTION public.trg_notify_document_sent_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  land_title text;
  doc_title text;
  assignee_role text;
  sign_path text;
  context_label text;
BEGIN
  IF NEW.status = 'sent'
     AND (OLD.status IS DISTINCT FROM 'sent')
     AND NEW.assigned_to IS NOT NULL THEN
    SELECT u.role INTO assignee_role FROM public.users u WHERE u.id = NEW.assigned_to;
    doc_title := COALESCE(NEW.title, 'Document');

    IF NEW.land_id IS NOT NULL THEN
      SELECT lr.title INTO land_title FROM public.land_records lr WHERE lr.id = NEW.land_id;
      context_label := COALESCE(land_title, 'Property');
    ELSE
      context_label := 'Investment agreement';
    END IF;

    IF assignee_role = 'executive' THEN
      sign_path := '/executive/documents?sign=' || NEW.id::text;
    ELSE
      sign_path := '/seller/documents?sign=' || NEW.id::text;
    END IF;

    PERFORM public.create_in_app_notification(
      NEW.assigned_to,
      'Document ready to sign',
      doc_title || ' — ' || context_label,
      sign_path
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_document_signed_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  land_title text;
  doc_title text;
  admin_path text;
  context_label text;
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS DISTINCT FROM 'signed') THEN
    doc_title := COALESCE(NEW.title, 'Document');

    IF NEW.land_id IS NOT NULL THEN
      SELECT lr.title INTO land_title FROM public.land_records lr WHERE lr.id = NEW.land_id;
      context_label := COALESCE(land_title, 'Property');
      admin_path := '/admin/documents?land=' || NEW.land_id::text;
    ELSE
      context_label := 'Investment agreement';
      admin_path := CASE
        WHEN NEW.investor_id IS NOT NULL
          THEN '/admin/investor-documents?land=' || NEW.investor_id::text
        ELSE '/admin/investor-documents'
      END;
    END IF;

    PERFORM public.notify_primary_admin(
      'Document signed',
      doc_title || ' — ' || context_label,
      admin_path
    );
  END IF;
  RETURN NEW;
END;
$$;
