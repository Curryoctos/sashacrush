-- Stripe Checkout for executive capital contributions (fund company pool).

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'investments'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%method%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.investments DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.investments
  ADD CONSTRAINT investments_method_check
  CHECK (method IN ('bank_transfer', 'mobile_money', 'other', 'stripe'));

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS investments_stripe_checkout_session_id_uidx
  ON public.investments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS investments_stripe_payment_intent_id_uidx
  ON public.investments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON COLUMN public.investments.stripe_checkout_session_id IS
  'Stripe Checkout Session id for card capital contributions.';
COMMENT ON COLUMN public.investments.stripe_payment_intent_id IS
  'Stripe PaymentIntent id once Checkout completes.';

ALTER TABLE public.gateway_webhook_events
  ADD COLUMN IF NOT EXISTS investment_id uuid REFERENCES public.investments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gateway_webhook_events_investment_id_idx
  ON public.gateway_webhook_events (investment_id);

-- Service role: create/confirm Stripe investments from edge functions.
GRANT SELECT, INSERT, UPDATE ON public.investments TO service_role;
GRANT SELECT, INSERT, DELETE ON public.gateway_webhook_events TO service_role;
