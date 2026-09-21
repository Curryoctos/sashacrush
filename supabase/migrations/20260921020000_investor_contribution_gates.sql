-- Gate capital contributions: accept current investment terms + sign pending
-- investor agreements before inserting into investments.

CREATE OR REPLACE FUNCTION public.current_investment_terms_version()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '2026-09-21'::text;
$$;

CREATE TABLE public.investor_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investor_consents_executive_version_unique UNIQUE (executive_id, terms_version)
);

CREATE INDEX investor_consents_executive_id_idx
  ON public.investor_consents (executive_id);

ALTER TABLE public.investor_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investor_consents_executive_select_own"
  ON public.investor_consents
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'executive'
    AND executive_id = auth.uid()
  );

CREATE POLICY "investor_consents_executive_insert_own"
  ON public.investor_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'executive'
    AND executive_id = auth.uid()
    AND terms_version = public.current_investment_terms_version()
  );

CREATE POLICY "investor_consents_admin_select"
  ON public.investor_consents
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin']));

-- Returns NULL when the executive may contribute; otherwise a short reason.
CREATE OR REPLACE FUNCTION public.executive_contribution_block_reason(p_executive_id uuid)
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
    WHERE u.id = p_executive_id
      AND u.role = 'executive'
      AND u.is_active = true
  ) THEN
    RETURN 'Only active investors can contribute to company capital.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.investor_consents c
    WHERE c.executive_id = p_executive_id
      AND c.terms_version = terms_version
  ) THEN
    RETURN 'Accept the investment terms and conditions before contributing.';
  END IF;

  SELECT COUNT(*)::integer INTO pending_count
  FROM public.documents d
  WHERE d.investor_id = p_executive_id
    AND d.assigned_to = p_executive_id
    AND d.status = 'sent';

  IF pending_count > 0 THEN
    RETURN 'Sign all pending investment agreements before contributing.';
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_investment_terms_version() TO authenticated;
GRANT EXECUTE ON FUNCTION public.executive_contribution_block_reason(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_investment_contribution_gates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  block_reason text;
BEGIN
  block_reason := public.executive_contribution_block_reason(NEW.executive_id);
  IF block_reason IS NOT NULL THEN
    RAISE EXCEPTION '%', block_reason
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_investment_contribution_gates ON public.investments;
CREATE TRIGGER enforce_investment_contribution_gates
  BEFORE INSERT ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_investment_contribution_gates();
