-- Protect Flutterwave transfer references after payout submission.
-- Clearing flutterwave_tx_ref on commercial-field edits allowed a second
-- initiate-gateway-payment call and risked double disbursement.

CREATE OR REPLACE FUNCTION public.invalidate_payment_checkout_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  IF OLD.amount_usd IS DISTINCT FROM NEW.amount_usd
     OR OLD.amount_ugx IS DISTINCT FROM NEW.amount_ugx
     OR OLD.method IS DISTINCT FROM NEW.method
     OR OLD.mobile_money_network IS DISTINCT FROM NEW.mobile_money_network
     OR OLD.rate_used IS DISTINCT FROM NEW.rate_used THEN
    NEW.gateway_checkout_url := NULL;
    NEW.stripe_payment_intent_id := NULL;

    -- Once a transfer reference is reserved/submitted, keep it. Changing
    -- commercial fields after submit would otherwise reopen initiate and
    -- risk paying the seller twice.
    IF OLD.flutterwave_tx_ref IS NOT NULL THEN
      IF NEW.status IS DISTINCT FROM 'failed' THEN
        RAISE EXCEPTION
          'Cannot change payout amount/method after Flutterwave transfer was submitted (ref %). Mark failed or create a new payout.',
          OLD.flutterwave_tx_ref;
      END IF;
      NEW.flutterwave_tx_ref := OLD.flutterwave_tx_ref;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.invalidate_payment_checkout_on_change() IS
  'Clears legacy checkout fields on commercial edits; refuses edits that would drop an in-flight Flutterwave payout reference.';
