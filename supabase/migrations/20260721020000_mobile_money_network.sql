-- Preserve the mobile-money network selected before Flutterwave checkout.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS mobile_money_network text
  CHECK (mobile_money_network IN ('mtn', 'airtel'));

COMMENT ON COLUMN public.payments.mobile_money_network IS
  'Uganda mobile-money network selected for a Flutterwave payment';
