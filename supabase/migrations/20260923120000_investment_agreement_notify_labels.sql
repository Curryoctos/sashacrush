-- Fix leftover "Savings agreement" labels and dead /executive/documents deep-links.
-- Agent capital docs are investment agreements; executive signing path was removed.

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

    IF assignee_role IN ('agent', 'executive') AND NEW.investor_id IS NOT NULL THEN
      -- Executives no longer sign capital docs; route legacy + agent to agreements.
      sign_path := '/agent/agreements?sign=' || NEW.id::text;
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
