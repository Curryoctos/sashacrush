-- Streamline: investments are deal-scoped and fund the company capital pool.
-- Drop the separate admin-managed savings timeline table.

-- 1) Require a land/deal on every capital contribution
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS land_id uuid REFERENCES public.land_records (id);

-- Local/dev may have zero rows; require land_id going forward.
UPDATE public.investments i
SET land_id = (
  SELECT lr.id
  FROM public.land_records lr
  WHERE lr.status IS DISTINCT FROM 'archived'
  ORDER BY lr.created_at ASC
  LIMIT 1
)
WHERE i.land_id IS NULL;

-- If still null (no land records), leave nullable briefly then enforce.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.investments WHERE land_id IS NULL) THEN
    RAISE NOTICE 'investments with null land_id remain; creating placeholder not allowed — delete orphans';
    DELETE FROM public.investments WHERE land_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.investments
  ALTER COLUMN land_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS investments_land_id_idx ON public.investments (land_id);

COMMENT ON TABLE public.investments IS
  'Agent investments toward a land deal. Confirmed amounts feed the company capital pool used for disbursements.';
COMMENT ON COLUMN public.investments.land_id IS
  'Deal/project this investment is earmarked toward.';

-- 2) Drop C-18 savings surface (replaced by deal-scoped investments)
DROP TRIGGER IF EXISTS savings_enforce_rules ON public.savings;
DROP FUNCTION IF EXISTS public.enforce_savings_rules();
DROP TABLE IF EXISTS public.savings;

-- 3) Contribution gate copy stays in function messages
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
    RETURN 'Only active agents can invest toward a deal.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.investor_consents c
    WHERE c.agent_id = p_agent_id
      AND c.terms_version = terms_version
  ) THEN
    RETURN 'Accept the investment terms and conditions before investing.';
  END IF;

  SELECT COUNT(*)::integer INTO pending_count
  FROM public.documents d
  WHERE d.investor_id = p_agent_id
    AND d.assigned_to = p_agent_id
    AND d.status = 'sent';

  IF pending_count > 0 THEN
    RETURN 'Sign all pending investment agreements before investing.';
  END IF;

  RETURN NULL;
END;
$$;
