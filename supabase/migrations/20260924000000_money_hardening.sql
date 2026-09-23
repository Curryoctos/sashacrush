-- Money hardening:
-- 1. Only admins may insert/update payments (agents retain read)
-- 2. Stripe investment cancel/reject cannot race a recorded PaymentIntent
-- 3. Paid Stripe webhooks may recover agent cancel → confirmed (service_role)

-- ── 1. Payments write: admin only ────────────────────────────
DROP POLICY IF EXISTS "payments_admin_agent_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_agent_update" ON public.payments;

CREATE POLICY "payments_admin_insert"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin']));

CREATE POLICY "payments_admin_update"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- Agent Stripe cancel only while no PaymentIntent is recorded yet.
DROP POLICY IF EXISTS "investments_agent_cancel_own_stripe" ON public.investments;

CREATE POLICY "investments_agent_cancel_own_stripe"
  ON public.investments
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
    AND status = 'pending'
    AND method = 'stripe'
    AND stripe_payment_intent_id IS NULL
  )
  WITH CHECK (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
    AND status = 'rejected'
    AND method = 'stripe'
    AND rejection_reason IS NOT NULL
    AND stripe_payment_intent_id IS NULL
  );

-- ── 2–3. Investment status transitions ───────────────────────
CREATE OR REPLACE FUNCTION public.enforce_investment_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contributor_role text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT role INTO contributor_role FROM public.users WHERE id = NEW.agent_id;
    IF contributor_role IS DISTINCT FROM 'agent' THEN
      RAISE EXCEPTION 'agent_id must reference a user with role agent';
    END IF;
    IF NEW.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'new investments must start as pending';
    END IF;
    NEW.reference := btrim(NEW.reference);
    IF NEW.reference = '' THEN
      RAISE EXCEPTION 'reference is required';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN
    RAISE EXCEPTION 'agent_id cannot be changed';
  END IF;

  IF OLD.amount_usd IS DISTINCT FROM NEW.amount_usd
     OR OLD.amount_ugx IS DISTINCT FROM NEW.amount_ugx
     OR OLD.rate_used IS DISTINCT FROM NEW.rate_used
     OR OLD.method IS DISTINCT FROM NEW.method
     OR OLD.reference IS DISTINCT FROM NEW.reference THEN
    IF OLD.status IS DISTINCT FROM 'pending' OR NEW.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'investment details can only change while pending';
    END IF;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Paid Stripe webhook may recover a premature agent cancel.
    IF OLD.status = 'rejected'
       AND NEW.status = 'confirmed'
       AND OLD.method = 'stripe'
       AND coalesce(auth.role(), '') = 'service_role' THEN
      NEW.confirmed_by := COALESCE(NEW.confirmed_by, auth.uid());
      NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
      NEW.rejection_reason := NULL;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    IF OLD.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'only pending investments can change status';
    END IF;
    IF NEW.status NOT IN ('confirmed', 'rejected') THEN
      RAISE EXCEPTION 'pending investments may only move to confirmed or rejected';
    END IF;

    -- Block cancel/reject once Stripe has recorded a PaymentIntent (funds may be captured).
    IF NEW.status = 'rejected'
       AND OLD.method = 'stripe'
       AND OLD.stripe_payment_intent_id IS NOT NULL THEN
      RAISE EXCEPTION
        'Cannot reject a Stripe investment after a payment intent was recorded'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'confirmed' THEN
      NEW.confirmed_by := COALESCE(NEW.confirmed_by, auth.uid());
      NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
      NEW.rejection_reason := NULL;
    ELSIF NEW.status = 'rejected' THEN
      NEW.confirmed_by := NULL;
      NEW.confirmed_at := NULL;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
