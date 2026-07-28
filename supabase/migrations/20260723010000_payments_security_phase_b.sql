-- Phase B payments security:
-- 1. Gateway webhook event idempotency
-- 2. Audit helper that records an explicit actor (service_role confirms)

CREATE TABLE public.gateway_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'flutterwave')),
  event_key text NOT NULL,
  function_name text NOT NULL,
  payment_id uuid REFERENCES public.payments (id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gateway_webhook_events_event_key_key UNIQUE (event_key)
);

CREATE INDEX gateway_webhook_events_payment_id_idx
  ON public.gateway_webhook_events (payment_id);

ALTER TABLE public.gateway_webhook_events ENABLE ROW LEVEL SECURITY;

-- No client policies — service_role only (bypasses RLS; still needs GRANT)
GRANT SELECT, INSERT ON public.gateway_webhook_events TO service_role;

-- Explicit-actor audit writes for edge confirms (auth.uid() is null under service_role)
CREATE OR REPLACE FUNCTION public.write_audit_log_as(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, p_action, p_entity_type, p_entity_id, p_metadata);
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log_as(uuid, text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log_as(uuid, text, text, uuid, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.write_audit_log_as(uuid, text, text, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.write_audit_log_as(uuid, text, text, uuid, jsonb) TO service_role;

-- Enrich automatic payment status-change audit metadata
CREATE OR REPLACE FUNCTION public.audit_payments_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'created',
      'payment',
      NEW.id,
      jsonb_build_object(
        'land_id', NEW.land_id,
        'amount_usd', NEW.amount_usd,
        'amount_ugx', NEW.amount_ugx,
        'method', NEW.method,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_audit_log(
      'status_changed',
      'payment',
      NEW.id,
      jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status,
        'land_id', NEW.land_id,
        'amount_usd', NEW.amount_usd,
        'method', NEW.method
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
