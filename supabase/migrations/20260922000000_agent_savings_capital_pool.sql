-- Re-home company capital contributions from executive → agent (field savings / capital).
-- Add C-18 land-linked savings records: admin write, agent read-own.

-- ---------------------------------------------------------------------------
-- 1. investments: executive_id → agent_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "investments_executive_select_own" ON public.investments;
DROP POLICY IF EXISTS "investments_executive_insert_own" ON public.investments;
DROP POLICY IF EXISTS "investments_executive_cancel_own_stripe" ON public.investments;

ALTER TABLE public.investments RENAME COLUMN executive_id TO agent_id;

ALTER INDEX IF EXISTS investments_executive_id_idx RENAME TO investments_agent_id_idx;

COMMENT ON TABLE public.investments IS
  'Agent capital contributions into the company pool (not deal-tagged). Funds company disbursements.';
COMMENT ON COLUMN public.investments.agent_id IS
  'Contributing agent. Must reference users.role = agent.';
COMMENT ON COLUMN public.investments.reference IS
  'Bank/MoMo/wire reference supplied by the agent for admin reconciliation.';

CREATE POLICY "investments_agent_select_own"
  ON public.investments
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
  );

CREATE POLICY "investments_agent_insert_own"
  ON public.investments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
    AND status = 'pending'
    AND confirmed_by IS NULL
    AND confirmed_at IS NULL
  );

CREATE POLICY "investments_agent_cancel_own_stripe"
  ON public.investments
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
    AND status = 'pending'
    AND method = 'stripe'
  )
  WITH CHECK (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
    AND status = 'rejected'
    AND method = 'stripe'
    AND rejection_reason IS NOT NULL
  );

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
        'agent_id', NEW.agent_id,
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
        'agent_id', NEW.agent_id,
        'amount_usd', NEW.amount_usd,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. investor_consents: executive_id → agent_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "investor_consents_executive_select_own" ON public.investor_consents;
DROP POLICY IF EXISTS "investor_consents_executive_insert_own" ON public.investor_consents;

ALTER TABLE public.investor_consents RENAME COLUMN executive_id TO agent_id;

ALTER INDEX IF EXISTS investor_consents_executive_id_idx RENAME TO investor_consents_agent_id_idx;

ALTER TABLE public.investor_consents
  RENAME CONSTRAINT investor_consents_executive_version_unique
  TO investor_consents_agent_version_unique;

CREATE POLICY "investor_consents_agent_select_own"
  ON public.investor_consents
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
  );

CREATE POLICY "investor_consents_agent_insert_own"
  ON public.investor_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
    AND terms_version = public.current_investment_terms_version()
  );

CREATE OR REPLACE FUNCTION public.agent_contribution_block_reason(p_agent_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  terms_version text := public.current_investment_terms_version();
  pending_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_agent_id
      AND u.role = 'agent'
      AND u.is_active = true
  ) THEN
    RETURN 'Only active agents can contribute to company capital.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.investor_consents c
    WHERE c.agent_id = p_agent_id
      AND c.terms_version = terms_version
  ) THEN
    RETURN 'Accept the savings terms and conditions before contributing.';
  END IF;

  SELECT COUNT(*)::integer INTO pending_count
  FROM public.documents d
  WHERE d.investor_id = p_agent_id
    AND d.assigned_to = p_agent_id
    AND d.status = 'sent';

  IF pending_count > 0 THEN
    RETURN 'Sign all pending savings agreements before contributing.';
  END IF;

  RETURN NULL;
END;
$$;

-- Keep old name as a thin wrapper so older clients fail safely until redeployed.
CREATE OR REPLACE FUNCTION public.executive_contribution_block_reason(p_executive_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.agent_contribution_block_reason(p_executive_id);
$$;

GRANT EXECUTE ON FUNCTION public.agent_contribution_block_reason(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_investment_contribution_gates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  block_reason text;
BEGIN
  block_reason := public.agent_contribution_block_reason(NEW.agent_id);
  IF block_reason IS NOT NULL THEN
    RAISE EXCEPTION '%', block_reason
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Document notify deep-links → agent agreements
-- ---------------------------------------------------------------------------
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
      context_label := 'Savings agreement';
    END IF;

    IF assignee_role = 'agent' AND NEW.investor_id IS NOT NULL THEN
      sign_path := '/agent/agreements?sign=' || NEW.id::text;
    ELSIF assignee_role = 'executive' AND NEW.investor_id IS NOT NULL THEN
      -- Legacy path if any old executive-scoped agreements remain
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
      context_label := 'Savings agreement';
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

-- ---------------------------------------------------------------------------
-- 4. C-18 savings: land-linked, admin write / agent read-own
-- ---------------------------------------------------------------------------
CREATE TABLE public.savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  land_id uuid NOT NULL REFERENCES public.land_records (id) ON DELETE CASCADE,
  current_balance_usd numeric NOT NULL DEFAULT 0 CHECK (current_balance_usd >= 0),
  monthly_contribution_usd numeric NOT NULL DEFAULT 0 CHECK (monthly_contribution_usd >= 0),
  target_amount_usd numeric NOT NULL CHECK (target_amount_usd > 0),
  projected_available_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT savings_agent_land_unique UNIQUE (agent_id, land_id)
);

CREATE INDEX savings_agent_id_idx ON public.savings (agent_id);
CREATE INDEX savings_land_id_idx ON public.savings (land_id);

COMMENT ON TABLE public.savings IS
  'Admin-managed projected savings timeline per agent and land. Agents read only.';

ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "savings_agent_select_own"
  ON public.savings
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'agent'
    AND agent_id = auth.uid()
  );

CREATE POLICY "savings_admin_select"
  ON public.savings
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin']));

CREATE POLICY "savings_admin_insert"
  ON public.savings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin']));

CREATE POLICY "savings_admin_update"
  ON public.savings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

CREATE POLICY "savings_admin_delete"
  ON public.savings
  FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['admin']));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings TO authenticated;
GRANT SELECT ON public.savings TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_savings_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_role text;
BEGIN
  SELECT role INTO agent_role FROM public.users WHERE id = NEW.agent_id;
  IF agent_role IS DISTINCT FROM 'agent' THEN
    RAISE EXCEPTION 'savings.agent_id must reference a user with role agent';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN
    RAISE EXCEPTION 'savings.agent_id cannot be changed';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER savings_enforce_rules
  BEFORE INSERT OR UPDATE ON public.savings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_savings_rules();
