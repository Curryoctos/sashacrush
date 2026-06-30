-- =============================================================================
-- RLS VERIFICATION — SashaCrush Phase 1 Security Matrix
-- =============================================================================
-- users:
--   admin:     read own row only (same as all roles — auth.uid() = id)
--   executive: read own row only
--   agent:     read own row only
--   seller:    read own row only
--
-- land_records:
--   admin:     SELECT, INSERT, UPDATE, DELETE (all rows)
--   agent:     SELECT, INSERT, UPDATE, DELETE (all rows)
--   executive: NO ACCESS (no policies granted)
--   seller:    SELECT only where seller_id = auth.uid()
--
-- payments:
--   admin:     SELECT (all rows)
--   agent:     SELECT (all rows)
--   executive: NO ACCESS
--   seller:    NO ACCESS — zero policies; table is never readable by seller
--
-- receipts:
--   admin:     SELECT (all rows)
--   agent:     SELECT (all rows)
--   executive: NO ACCESS
--   seller:    SELECT only where seller_id = auth.uid()
--
-- documents:
--   admin:     SELECT, INSERT, UPDATE, DELETE (all rows)
--   agent:     SELECT, INSERT, UPDATE, DELETE (all rows)
--   executive: NO ACCESS
--   seller:    SELECT, UPDATE only where land_id belongs to seller
--
-- photos:
--   admin:     SELECT, INSERT (all rows)
--   agent:     SELECT, INSERT (all rows)
--   executive: NO ACCESS
--   seller:    SELECT, INSERT only where land_id belongs to seller
--
-- chat_messages:
--   admin:     SELECT, INSERT (all rows, both channels)
--   agent:     SELECT, INSERT (all rows, both channels)
--   executive: SELECT, INSERT on executive_channel only
--   seller:    SELECT, INSERT on seller_channel + own land_id ONLY
--              executive_channel: EXPLICITLY BLOCKED via RESTRICTIVE policies
--              (sellers cannot read or insert executive_channel under any condition)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'executive', 'agent', 'seller')),
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.land_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  total_value_usd numeric NOT NULL,
  seller_id uuid REFERENCES public.users (id),
  latitude numeric,
  longitude numeric,
  boundary_geojson jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id uuid NOT NULL REFERENCES public.land_records (id),
  amount_usd numeric NOT NULL,
  amount_ugx numeric,
  method text CHECK (method IN ('stripe', 'flutterwave', 'crypto', 'manual')),
  rate_used numeric,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments (id),
  seller_id uuid NOT NULL REFERENCES public.users (id),
  receipt_number text NOT NULL UNIQUE,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id uuid NOT NULL REFERENCES public.land_records (id),
  uploader_id uuid NOT NULL REFERENCES public.users (id),
  file_path text,
  title text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'archived')),
  signature_hash text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id uuid NOT NULL REFERENCES public.land_records (id),
  uploader_id uuid NOT NULL REFERENCES public.users (id),
  file_path text,
  latitude numeric,
  longitude numeric,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('seller_channel', 'executive_channel')),
  land_id uuid REFERENCES public.land_records (id),
  sender_id uuid NOT NULL REFERENCES public.users (id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, used by RLS policies)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_seller_of_land(land uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.land_records
    WHERE id = land
      AND seller_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- users — RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- land_records — RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.land_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "land_records_admin_agent_select"
  ON public.land_records
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "land_records_admin_agent_insert"
  ON public.land_records
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "land_records_admin_agent_update"
  ON public.land_records
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']))
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "land_records_admin_agent_delete"
  ON public.land_records
  FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "land_records_seller_select_own"
  ON public.land_records
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND seller_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- payments — RLS (sellers have ZERO access — no seller policies exist)
-- -----------------------------------------------------------------------------

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_admin_agent_select"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

-- -----------------------------------------------------------------------------
-- receipts — RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_admin_agent_select"
  ON public.receipts
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "receipts_seller_select_own"
  ON public.receipts
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND seller_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- documents — RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_admin_agent_select"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "documents_admin_agent_insert"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "documents_admin_agent_update"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']))
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "documents_admin_agent_delete"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "documents_seller_select_own_land"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND public.is_seller_of_land(land_id)
  );

CREATE POLICY "documents_seller_update_own_land"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND public.is_seller_of_land(land_id)
  )
  WITH CHECK (
    public.current_user_role() = 'seller'
    AND public.is_seller_of_land(land_id)
  );

-- -----------------------------------------------------------------------------
-- photos — RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos_admin_agent_select"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "photos_admin_agent_insert"
  ON public.photos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "photos_seller_select_own_land"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND public.is_seller_of_land(land_id)
  );

CREATE POLICY "photos_seller_insert_own_land"
  ON public.photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'seller'
    AND public.is_seller_of_land(land_id)
    AND uploader_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- chat_messages — RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_admin_agent_select"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "chat_messages_admin_agent_insert"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'agent']));

CREATE POLICY "chat_messages_executive_select"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'executive'
    AND channel = 'executive_channel'
  );

CREATE POLICY "chat_messages_executive_insert"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'executive'
    AND channel = 'executive_channel'
    AND sender_id = auth.uid()
  );

CREATE POLICY "chat_messages_seller_select_own_channel"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'seller'
    AND channel = 'seller_channel'
    AND land_id IS NOT NULL
    AND public.is_seller_of_land(land_id)
  );

CREATE POLICY "chat_messages_seller_insert_own_channel"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'seller'
    AND channel = 'seller_channel'
    AND land_id IS NOT NULL
    AND public.is_seller_of_land(land_id)
    AND sender_id = auth.uid()
  );

-- EXPLICIT seller denial: RESTRICTIVE policies block executive_channel access
-- even if a future permissive policy were added by mistake.
CREATE POLICY "chat_messages_block_seller_executive_channel_select"
  ON public.chat_messages
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    NOT (
      public.current_user_role() = 'seller'
      AND channel = 'executive_channel'
    )
  );

CREATE POLICY "chat_messages_block_seller_executive_channel_insert"
  ON public.chat_messages
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT (
      public.current_user_role() = 'seller'
      AND channel = 'executive_channel'
    )
  );

-- -----------------------------------------------------------------------------
-- API role grants (RLS policies enforce row-level restrictions on top of these)
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.land_records TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT ON public.photos TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
