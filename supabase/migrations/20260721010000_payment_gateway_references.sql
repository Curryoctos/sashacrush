-- Gateway checkout fields for Stripe Checkout + Flutterwave hosted payments.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS flutterwave_tx_ref text,
  ADD COLUMN IF NOT EXISTS gateway_checkout_url text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_flutterwave_tx_ref_uidx
  ON public.payments (flutterwave_tx_ref)
  WHERE flutterwave_tx_ref IS NOT NULL;

COMMENT ON COLUMN public.payments.flutterwave_tx_ref IS
  'Flutterwave tx_ref used to match webhook confirmations';
COMMENT ON COLUMN public.payments.gateway_checkout_url IS
  'Hosted checkout URL (Stripe Checkout or Flutterwave payment link)';
