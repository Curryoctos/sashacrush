-- Phase A payments security:
-- 1. One receipt per payment
-- 2. Atomic receipt-number allocation (advisory lock + count in one TX)
-- 3. Only service_role may confirm payments or insert receipts

-- ── 1. One receipt per payment ──────────────────────────────
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_payment_id_key UNIQUE (payment_id);

-- ── 2. Atomic receipt number (replaces split lock+count RPCs) ─
CREATE OR REPLACE FUNCTION public.allocate_receipt_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_n bigint;
  year_text text;
BEGIN
  PERFORM pg_advisory_xact_lock(7482910);

  SELECT COUNT(*)::bigint INTO next_n FROM public.receipts;
  next_n := next_n + 1;
  year_text := to_char((timezone('utc', now())), 'YYYY');

  RETURN 'SC-' || year_text || '-' || lpad(next_n::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_receipt_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_receipt_number() FROM authenticated;
REVOKE ALL ON FUNCTION public.allocate_receipt_number() FROM anon;
GRANT EXECUTE ON FUNCTION public.allocate_receipt_number() TO service_role;

-- Keep get_advisory_lock for compatibility, but allocate_receipt_number is preferred.

-- ── 3. Clients cannot insert receipts (edge/service_role only) ─
DROP POLICY IF EXISTS "receipts_admin_agent_insert" ON public.receipts;
REVOKE INSERT ON public.receipts FROM authenticated;

-- ── 4. Clients cannot transition payments → confirmed ───────
-- Staff may still UPDATE pending rows (gateway URLs, refs, etc.).
CREATE OR REPLACE FUNCTION public.enforce_payment_confirm_service_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed'
     AND OLD.status IS DISTINCT FROM 'confirmed'
     AND coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the confirm-payment edge path (service_role) may confirm payments'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_confirm_service_role_trigger ON public.payments;
CREATE TRIGGER payments_confirm_service_role_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_confirm_service_role();
