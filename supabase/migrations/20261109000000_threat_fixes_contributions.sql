-- Threat fixes: project contributions, raised totals, follower RLS,
-- admin-only boundary edits, chat in-app alerts, project-only payout notify,
-- community join_reason capture.

-- ── 0. Community join reason (onboarding gap) ────────────────────────────────
ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS join_reason text;

COMMENT ON COLUMN public.community_members.join_reason IS
  'Optional reason for joining (investor motivation / interest capture).';

-- ── Helper: role for an arbitrary user id ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role_for(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = p_user_id;
$$;

-- ── 1. Project contributions (inbound funding) ───────────────────────────────
CREATE TABLE public.project_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  contributor_name text NOT NULL,
  contributor_email text NOT NULL,
  contributor_country text,
  is_anonymous boolean NOT NULL DEFAULT false,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  amount_ugx numeric CHECK (amount_ugx IS NULL OR amount_ugx > 0),
  method text NOT NULL CHECK (method IN ('stripe', 'mobile_money', 'wire', 'crypto')),
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  payer_phone text,
  mobile_money_network text CHECK (
    mobile_money_network IS NULL
    OR mobile_money_network IN ('mtn', 'airtel')
  ),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  notes text,
  confirmed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_contributions_reference_unique UNIQUE (reference),
  CONSTRAINT project_contributions_email_nonempty
    CHECK (char_length(btrim(contributor_email)) > 3),
  CONSTRAINT project_contributions_name_nonempty
    CHECK (char_length(btrim(contributor_name)) > 0)
);

CREATE INDEX project_contributions_project_id_idx
  ON public.project_contributions (project_id, created_at DESC);
CREATE INDEX project_contributions_status_idx
  ON public.project_contributions (status, created_at DESC);
CREATE INDEX project_contributions_user_id_idx
  ON public.project_contributions (user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.project_contributions IS
  'Inbound public/project funding (Stripe Checkout, wire, MoMo intent, crypto intent).';

ALTER TABLE public.project_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_contributions_admin_select"
  ON public.project_contributions
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "project_contributions_self_select"
  ON public.project_contributions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins reconcile wire / MoMo / crypto intents (Stripe confirms via webhook).
CREATE POLICY "project_contributions_admin_update"
  ON public.project_contributions
  FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

GRANT SELECT, UPDATE ON public.project_contributions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.project_contributions TO service_role;

ALTER TABLE public.gateway_webhook_events
  ADD COLUMN IF NOT EXISTS contribution_id uuid
    REFERENCES public.project_contributions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gateway_webhook_events_contribution_id_idx
  ON public.gateway_webhook_events (contribution_id);

CREATE OR REPLACE FUNCTION public.trg_project_contribution_raised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric := 0;
  target_project uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_project := NEW.project_id;
    IF NEW.status = 'confirmed' THEN
      delta := NEW.amount_usd;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    target_project := NEW.project_id;
    IF OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' THEN
      delta := NEW.amount_usd;
    ELSIF OLD.status = 'confirmed' AND NEW.status IS DISTINCT FROM 'confirmed' THEN
      delta := -OLD.amount_usd;
    ELSIF OLD.status = 'confirmed' AND NEW.status = 'confirmed'
      AND OLD.amount_usd IS DISTINCT FROM NEW.amount_usd THEN
      delta := NEW.amount_usd - OLD.amount_usd;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    target_project := OLD.project_id;
    IF OLD.status = 'confirmed' THEN
      delta := -OLD.amount_usd;
    END IF;
  END IF;

  IF delta <> 0 AND target_project IS NOT NULL THEN
    UPDATE public.projects
    SET
      funding_raised_usd = GREATEST(0, funding_raised_usd + delta),
      updated_at = now()
    WHERE id = target_project;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_contributions_raised ON public.project_contributions;
CREATE TRIGGER project_contributions_raised
  AFTER INSERT OR UPDATE OR DELETE ON public.project_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_contribution_raised();

CREATE OR REPLACE FUNCTION public.trg_notify_contribution_confirmed_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_title text;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    SELECT title INTO project_title FROM public.projects WHERE id = NEW.project_id;
    PERFORM public.notify_primary_admin(
      'Contribution confirmed',
      COALESCE(project_title, 'Project') || ' — $' || NEW.amount_usd::text,
      '/admin/projects'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_contributions_in_app_notify ON public.project_contributions;
CREATE TRIGGER project_contributions_in_app_notify
  AFTER UPDATE ON public.project_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_contribution_confirmed_in_app();

-- ── 2. Followers can self-insert / self-update ────────────────────────────────
CREATE POLICY "project_participants_self_insert_follower"
  ON public.project_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'follower'
  );

CREATE POLICY "project_participants_self_update_follower"
  ON public.project_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'follower'
  );

-- ── 3. Boundary / site pin edits: admin only (agents keep other updates) ─────
-- Service-role / system updates (auth.uid() null) are allowed.
CREATE OR REPLACE FUNCTION public.enforce_land_geo_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.boundary_geojson IS DISTINCT FROM OLD.boundary_geojson
     OR NEW.latitude IS DISTINCT FROM OLD.latitude
     OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
    IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only admins can edit land boundary or site pin coordinates';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS land_records_geo_admin_only ON public.land_records;
CREATE TRIGGER land_records_geo_admin_only
  BEFORE UPDATE ON public.land_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_land_geo_admin_only();

-- ── 4. Chat → in-app notifications ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_chat_message_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  land_title text;
  sender_name text;
  recipient uuid;
  sender_role text;
BEGIN
  sender_role := public.current_user_role_for(NEW.sender_id);
  SELECT coalesce(full_name, email) INTO sender_name
  FROM public.users WHERE id = NEW.sender_id;

  IF NEW.land_id IS NOT NULL THEN
    SELECT title INTO land_title FROM public.land_records WHERE id = NEW.land_id;
  END IF;

  IF NEW.channel = 'seller_channel' THEN
    IF sender_role = 'seller' THEN
      PERFORM public.notify_primary_admin(
        'New seller message',
        coalesce(sender_name, 'Seller') || ' · ' || coalesce(land_title, 'Deal'),
        CASE
          WHEN NEW.land_id IS NOT NULL THEN '/admin/chat?land=' || NEW.land_id::text
          ELSE '/admin/chat'
        END
      );
    ELSIF NEW.land_id IS NOT NULL THEN
      SELECT seller_id INTO recipient FROM public.land_records WHERE id = NEW.land_id;
      IF recipient IS NOT NULL AND recipient IS DISTINCT FROM NEW.sender_id THEN
        PERFORM public.create_in_app_notification(
          recipient,
          'New message',
          coalesce(land_title, 'Your deal') || ' — ' || left(NEW.body, 120),
          '/seller/chat?land=' || NEW.land_id::text
        );
      END IF;
    END IF;
  ELSIF NEW.channel = 'executive_channel' THEN
    IF sender_role = 'executive' THEN
      PERFORM public.notify_primary_admin(
        'Executive message',
        coalesce(sender_name, 'Executive') || ' · ' || coalesce(land_title, 'Deal'),
        CASE
          WHEN NEW.land_id IS NOT NULL THEN '/admin/chat?land=' || NEW.land_id::text
          ELSE '/admin/chat'
        END
      );
    ELSE
      INSERT INTO public.in_app_notifications (user_id, title, body, href)
      SELECT u.id,
             'Staff message',
             coalesce(land_title, 'Deal') || ' — ' || left(NEW.body, 120),
             '/executive/communications'
      FROM public.users u
      WHERE u.role = 'executive'
        AND u.is_active = true
        AND u.id IS DISTINCT FROM NEW.sender_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_in_app_notify ON public.chat_messages;
CREATE TRIGGER chat_messages_in_app_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_chat_message_in_app();

-- ── 5. Payment confirmed in-app works for project-only payouts ────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_payment_confirmed_in_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  label text;
  href text;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    IF NEW.land_id IS NOT NULL THEN
      SELECT title INTO label FROM public.land_records WHERE id = NEW.land_id;
      href := '/admin/payments?land=' || NEW.land_id::text;
    ELSIF NEW.project_id IS NOT NULL THEN
      SELECT title INTO label FROM public.projects WHERE id = NEW.project_id;
      href := '/admin/payments?project=' || NEW.project_id::text;
    ELSE
      label := 'Payout';
      href := '/admin/payments';
    END IF;

    PERFORM public.notify_primary_admin(
      'Payment confirmed',
      COALESCE(label, 'Payout') || ' — $' || NEW.amount_usd::text,
      href
    );
  END IF;
  RETURN NEW;
END;
$$;
