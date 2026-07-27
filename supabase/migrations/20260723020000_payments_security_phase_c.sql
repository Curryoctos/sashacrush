-- Phase C payments polish:
-- 1. Denormalize seller-safe receipt fields (amounts + land title)
-- 2. Soft cap: single payment cannot exceed land total_value_usd
-- 3. Invalidate gateway checkout when amount/method changes on pending payments

-- ── 1. Receipt fields sellers can read without payments access ─
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS amount_usd numeric(14, 2),
  ADD COLUMN IF NOT EXISTS amount_ugx numeric(18, 2),
  ADD COLUMN IF NOT EXISTS rate_used numeric(14, 6),
  ADD COLUMN IF NOT EXISTS land_id uuid REFERENCES public.land_records (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS land_title text;

UPDATE public.receipts r
SET
  amount_usd = p.amount_usd,
  amount_ugx = p.amount_ugx,
  rate_used = p.rate_used,
  land_id = p.land_id,
  land_title = lr.title
FROM public.payments p
LEFT JOIN public.land_records lr ON lr.id = p.land_id
WHERE r.payment_id = p.id
  AND (r.amount_usd IS NULL OR r.land_id IS NULL);

ALTER TABLE public.receipts
  ALTER COLUMN amount_usd SET DEFAULT 0;

-- New receipts should always carry amount_usd
ALTER TABLE public.receipts
  ALTER COLUMN amount_usd SET NOT NULL;

CREATE INDEX IF NOT EXISTS receipts_land_id_idx ON public.receipts (land_id);

-- ── 2. Soft cap: payment amount cannot exceed deal total ─────
CREATE OR REPLACE FUNCTION public.enforce_payment_amount_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deal_total numeric;
  allocated numeric;
  remaining numeric;
BEGIN
  SELECT total_value_usd INTO deal_total
  FROM public.land_records
  WHERE id = NEW.land_id;

  IF deal_total IS NULL THEN
    RAISE EXCEPTION 'Land record not found for payment'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.amount_usd <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive'
      USING ERRCODE = '23514';
  END IF;

  -- Hard ceiling: a single payment may not exceed the full deal value
  IF NEW.amount_usd > deal_total THEN
    RAISE EXCEPTION
      'Payment of % USD exceeds deal total of % USD',
      NEW.amount_usd,
      deal_total
      USING ERRCODE = '23514';
  END IF;

  -- Soft cap: include pending + confirmed (exclude failed / this row)
  SELECT coalesce(SUM(amount_usd), 0) INTO allocated
  FROM public.payments
  WHERE land_id = NEW.land_id
    AND status IS DISTINCT FROM 'failed'
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

  remaining := deal_total - allocated;

  IF NEW.amount_usd > remaining THEN
    RAISE EXCEPTION
      'Payment of % USD exceeds remaining outstanding balance of % USD',
      NEW.amount_usd,
      remaining
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_amount_cap_trigger ON public.payments;
CREATE TRIGGER payments_amount_cap_trigger
  BEFORE INSERT OR UPDATE OF amount_usd, land_id, status
  ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_amount_cap();

-- ── 3. Invalidate checkout when commercial fields change ─────
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
    NEW.flutterwave_tx_ref := NULL;
    NEW.stripe_payment_intent_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_invalidate_checkout_trigger ON public.payments;
CREATE TRIGGER payments_invalidate_checkout_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_payment_checkout_on_change();
