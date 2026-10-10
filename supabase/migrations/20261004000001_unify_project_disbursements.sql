-- =============================================================================
-- Unify outbound money under projects: require project_id + disbursement_reason.
-- land_id remains optional (e.g. land_acquisition linkage). Amount cap uses
-- project funding_goal_usd when set.
-- =============================================================================

-- ── 1. Disbursement reason ───────────────────────────────────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS disbursement_reason text;

UPDATE public.payments
SET disbursement_reason = 'Legacy disbursement (recorded before reasons were required)'
WHERE disbursement_reason IS NULL
   OR btrim(disbursement_reason) = '';

ALTER TABLE public.payments
  ALTER COLUMN disbursement_reason SET NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_disbursement_reason_nonempty;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_disbursement_reason_nonempty
  CHECK (char_length(btrim(disbursement_reason)) >= 3);

COMMENT ON COLUMN public.payments.disbursement_reason IS
  'Why this purchase/disbursement was made toward the project (required at create).';

-- ── 2. Backfill project_id for land-only payments ────────────────────────────
-- Create a land_acquisition project per land that still has orphan payments.
INSERT INTO public.projects (
  title,
  slug,
  description,
  cause,
  type,
  visibility,
  funding_goal_usd,
  funding_raised_usd,
  min_contribution_usd,
  location_name,
  country,
  latitude,
  longitude,
  status,
  tags
)
SELECT
  lr.title,
  'land-' || replace(lr.id::text, '-', ''),
  coalesce(
    nullif(btrim(lr.description), ''),
    'Land acquisition project migrated from deal payouts for ' || lr.title || '.'
  ),
  'Seller disbursements and project purchases for this land acquisition.',
  'land_acquisition',
  'private',
  lr.total_value_usd,
  0,
  10,
  lr.location,
  'Uganda',
  lr.latitude,
  lr.longitude,
  CASE WHEN lr.status = 'archived' THEN 'completed' ELSE 'active' END,
  ARRAY['land', 'migrated']
FROM public.land_records lr
WHERE EXISTS (
  SELECT 1
  FROM public.payments p
  WHERE p.land_id = lr.id
    AND p.project_id IS NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM public.projects pr
  WHERE pr.slug = 'land-' || replace(lr.id::text, '-', '')
);

UPDATE public.payments p
SET project_id = pr.id
FROM public.projects pr
WHERE p.project_id IS NULL
  AND p.land_id IS NOT NULL
  AND pr.slug = 'land-' || replace(p.land_id::text, '-', '');

-- Any remaining orphans (should be rare) attach to seed Mubende project if present.
UPDATE public.payments
SET project_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE project_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  );

-- Fail loudly if anything is still unscoped (no seed / no land).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payments WHERE project_id IS NULL) THEN
    RAISE EXCEPTION
      'Cannot require payments.project_id: orphan payment rows remain without a project';
  END IF;
END $$;

ALTER TABLE public.payments
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_land_or_project_required;

COMMENT ON COLUMN public.payments.project_id IS
  'Required target project for every outbound purchase/disbursement.';

COMMENT ON COLUMN public.payments.land_id IS
  'Optional land deal linkage when the project is a land acquisition.';

-- ── 3. Amount cap: project budget (funding_goal) when set ────────────────────
CREATE OR REPLACE FUNCTION public.enforce_payment_amount_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget_total numeric;
  allocated numeric;
  remaining numeric;
BEGIN
  IF NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'Payment requires a project_id'
      USING ERRCODE = '23502';
  END IF;

  IF NEW.amount_usd IS NULL OR NEW.amount_usd <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.disbursement_reason IS NULL
     OR char_length(btrim(NEW.disbursement_reason)) < 3 THEN
    RAISE EXCEPTION 'Disbursement reason is required (at least 3 characters)'
      USING ERRCODE = '23514';
  END IF;

  SELECT funding_goal_usd INTO budget_total
  FROM public.projects
  WHERE id = NEW.project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found for payment'
      USING ERRCODE = '23503';
  END IF;

  -- No funding goal → only positive amount + reason (company capital checked in app).
  IF budget_total IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.amount_usd > budget_total THEN
    RAISE EXCEPTION
      'Payment of % USD exceeds project funding goal of % USD',
      NEW.amount_usd,
      budget_total
      USING ERRCODE = '23514';
  END IF;

  SELECT coalesce(SUM(amount_usd), 0) INTO allocated
  FROM public.payments
  WHERE project_id = NEW.project_id
    AND status IS DISTINCT FROM 'failed'
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

  remaining := budget_total - allocated;

  IF NEW.amount_usd > remaining THEN
    RAISE EXCEPTION
      'Payment of % USD exceeds remaining project budget of % USD',
      NEW.amount_usd,
      remaining
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_amount_cap_trigger ON public.payments;
CREATE TRIGGER payments_amount_cap_trigger
  BEFORE INSERT OR UPDATE OF amount_usd, project_id, land_id, status, disbursement_reason
  ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_amount_cap();
