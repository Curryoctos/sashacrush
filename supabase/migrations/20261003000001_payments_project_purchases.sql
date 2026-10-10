-- Allow purchases (outbound disbursements) against a project without a land deal.
-- land_id remains for classic seller payouts; project_id for funding-project purchases.
-- At least one target must be set.

ALTER TABLE public.payments
  ALTER COLUMN land_id DROP NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_land_or_project_required;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_land_or_project_required
  CHECK (land_id IS NOT NULL OR project_id IS NOT NULL);

COMMENT ON COLUMN public.payments.project_id IS
  'Outbound purchase/disbursement target for a funding project. Coexists with land_id.';

COMMENT ON COLUMN public.payments.land_id IS
  'Outbound seller disbursement target for a land deal. Nullable when project_id is set.';

GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;
