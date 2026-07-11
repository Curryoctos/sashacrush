-- Sprint 5: audit log, rate limiting, receipts storage

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users (id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_agent_select"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE TABLE public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_events_key_created_idx
  ON public.rate_limit_events (rate_key, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_land_records_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log('created', 'land_record', NEW.id, jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'updated',
      'land_record',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'seller_id', NEW.seller_id,
        'status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_payments_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'created',
      'payment',
      NEW.id,
      jsonb_build_object('land_id', NEW.land_id, 'amount_usd', NEW.amount_usd, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_audit_log(
      'status_changed',
      'payment',
      NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'land_id', NEW.land_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_documents_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'created',
      'document',
      NEW.id,
      jsonb_build_object('land_id', NEW.land_id, 'title', NEW.title, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_audit_log(
      'status_changed',
      'document',
      NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'land_id', NEW.land_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_land_records_trigger ON public.land_records;
CREATE TRIGGER audit_land_records_trigger
  AFTER INSERT OR UPDATE ON public.land_records
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_land_records_changes();

DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_payments_changes();

DROP TRIGGER IF EXISTS audit_documents_trigger ON public.documents;
CREATE TRIGGER audit_documents_trigger
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_documents_changes();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "receipts_storage_admin_agent_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.has_role(ARRAY['admin', 'agent'])
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.has_role(ARRAY['admin', 'agent'])
  );

CREATE POLICY "receipts_storage_seller_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.current_user_role() = 'seller'
    AND EXISTS (
      SELECT 1
      FROM public.receipts r
      WHERE r.pdf_path = storage.objects.name
        AND r.seller_id = auth.uid()
    )
  );

CREATE POLICY "receipts_storage_admin_agent_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.has_role(ARRAY['admin', 'agent'])
  );
