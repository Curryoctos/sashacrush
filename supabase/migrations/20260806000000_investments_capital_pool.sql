-- Company-wide capital contributions from executives (inbound).
-- Separate from payments (seller disbursements).

CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id uuid NOT NULL REFERENCES public.users (id),
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  amount_ugx numeric CHECK (amount_ugx IS NULL OR amount_ugx > 0),
  rate_used numeric,
  method text NOT NULL CHECK (method IN ('bank_transfer', 'mobile_money', 'other')),
  reference text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by uuid REFERENCES public.users (id),
  confirmed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investments_reference_unique UNIQUE (reference)
);

CREATE INDEX investments_executive_id_idx ON public.investments (executive_id);
CREATE INDEX investments_status_created_idx ON public.investments (status, created_at DESC);

COMMENT ON TABLE public.investments IS
  'Executive capital contributions into the company pool (not deal-tagged).';
COMMENT ON COLUMN public.investments.reference IS
  'Bank/MoMo/wire reference supplied by the executive for admin reconciliation.';

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Executives: read and create own pending contributions
CREATE POLICY "investments_executive_select_own"
  ON public.investments
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'executive'
    AND executive_id = auth.uid()
  );

CREATE POLICY "investments_executive_insert_own"
  ON public.investments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'executive'
    AND executive_id = auth.uid()
    AND status = 'pending'
    AND confirmed_by IS NULL
    AND confirmed_at IS NULL
  );

-- Admins: full read + confirm/reject updates
CREATE POLICY "investments_admin_select"
  ON public.investments
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin']));

CREATE POLICY "investments_admin_update"
  ON public.investments
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

GRANT SELECT, INSERT, UPDATE ON public.investments TO authenticated;
GRANT SELECT ON public.investments TO service_role;

-- Keep executive_id tied to an executive user; protect status transitions
CREATE OR REPLACE FUNCTION public.enforce_investment_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exec_role text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT role INTO exec_role FROM public.users WHERE id = NEW.executive_id;
    IF exec_role IS DISTINCT FROM 'executive' THEN
      RAISE EXCEPTION 'executive_id must reference a user with role executive';
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

  -- UPDATE
  IF OLD.executive_id IS DISTINCT FROM NEW.executive_id THEN
    RAISE EXCEPTION 'executive_id cannot be changed';
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
    IF OLD.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'only pending investments can change status';
    END IF;
    IF NEW.status NOT IN ('confirmed', 'rejected') THEN
      RAISE EXCEPTION 'pending investments may only move to confirmed or rejected';
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

CREATE TRIGGER investments_enforce_rules
  BEFORE INSERT OR UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_investment_rules();

-- Audit trail (same pattern as payments)
CREATE OR REPLACE FUNCTION public.audit_investments_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'created',
      'investment',
      NEW.id,
      jsonb_build_object(
        'executive_id', NEW.executive_id,
        'amount_usd', NEW.amount_usd,
        'method', NEW.method,
        'reference', NEW.reference,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_audit_log(
      'status_changed',
      'investment',
      NEW.id,
      jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status,
        'executive_id', NEW.executive_id,
        'amount_usd', NEW.amount_usd,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER investments_audit
  AFTER INSERT OR UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_investments_changes();
