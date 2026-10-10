-- Manual reconciliation reference (C-15) + MoMo payer phone (C-08).

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS manual_reference text,
  ADD COLUMN IF NOT EXISTS payer_phone text;

COMMENT ON COLUMN public.payments.manual_reference IS
  'Unique wire/cash reference (e.g. WU-…) for manual reconciliation; shown on receipt.';

COMMENT ON COLUMN public.payments.payer_phone IS
  'Payer MSISDN for Flutterwave mobile-money checkout.';

CREATE UNIQUE INDEX IF NOT EXISTS payments_manual_reference_uidx
  ON public.payments (manual_reference)
  WHERE manual_reference IS NOT NULL;
