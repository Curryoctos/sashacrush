-- Sprint 8: in-app notification center

CREATE TABLE public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX in_app_notifications_user_created_idx
  ON public.in_app_notifications (user_id, created_at DESC);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "in_app_notifications_select_own"
  ON public.in_app_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "in_app_notifications_update_own"
  ON public.in_app_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.in_app_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.create_in_app_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_href text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.in_app_notifications (user_id, title, body, href)
  VALUES (p_user_id, p_title, p_body, p_href);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_primary_admin(
  p_title text,
  p_body text,
  p_href text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM public.users
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;

  IF admin_id IS NOT NULL THEN
    PERFORM public.create_in_app_notification(admin_id, p_title, p_body, p_href);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_receipt_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_in_app_notification(
    NEW.seller_id,
    'Receipt issued',
    'Receipt ' || NEW.receipt_number || ' is ready to download.',
    '/seller/receipts'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_payment_confirmed_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  land_title text;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    SELECT title INTO land_title FROM public.land_records WHERE id = NEW.land_id;
    PERFORM public.notify_primary_admin(
      'Payment confirmed',
      COALESCE(land_title, 'Property') || ' — $' || NEW.amount_usd::text,
      '/admin/payments?land=' || NEW.land_id::text
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
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS DISTINCT FROM 'signed') THEN
    SELECT lr.title INTO land_title FROM public.land_records lr WHERE lr.id = NEW.land_id;
    doc_title := COALESCE(NEW.title, 'Document');
    PERFORM public.notify_primary_admin(
      'Document signed',
      doc_title || ' — ' || COALESCE(land_title, 'Property'),
      '/admin/documents?land=' || NEW.land_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_document_sent_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  land_title text;
  doc_title text;
BEGIN
  IF NEW.status = 'sent'
     AND (OLD.status IS DISTINCT FROM 'sent')
     AND NEW.assigned_to IS NOT NULL THEN
    SELECT lr.title INTO land_title FROM public.land_records lr WHERE lr.id = NEW.land_id;
    doc_title := COALESCE(NEW.title, 'Document');
    PERFORM public.create_in_app_notification(
      NEW.assigned_to,
      'Document ready to sign',
      doc_title || ' — ' || COALESCE(land_title, 'Property'),
      '/seller/documents?sign=' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER receipts_in_app_notify
  AFTER INSERT ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_receipt_in_app();

CREATE TRIGGER payments_in_app_notify
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_payment_confirmed_in_app();

CREATE TRIGGER documents_signed_in_app_notify
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_document_signed_in_app();

CREATE TRIGGER documents_sent_in_app_notify
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_document_sent_in_app();
