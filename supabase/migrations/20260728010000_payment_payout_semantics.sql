-- Clarify payments.payer_phone as seller receive MSISDN for payouts
-- (column kept for backwards compatibility; collect-in checkout retired).

COMMENT ON COLUMN public.payments.payer_phone IS
  'Seller MoMo receive MSISDN for Flutterwave transfer payouts (company → seller).';

COMMENT ON COLUMN public.payments.gateway_checkout_url IS
  'Legacy collect-in checkout URL; unused for Flutterwave transfer payouts.';

COMMENT ON COLUMN public.payments.flutterwave_tx_ref IS
  'Flutterwave transfer reference for MoMo payouts (or legacy charge tx_ref).';
