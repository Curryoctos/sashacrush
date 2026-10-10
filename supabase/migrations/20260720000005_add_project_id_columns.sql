-- =============================================================================
-- Add nullable project_id alongside existing land_id (never drop land_id).
-- savings was temporary and dropped in 20260922010000 — use investments instead.
-- suggestions is created later (20260923010000); column added via DO block when present,
-- and also ensured by a companion statement that runs safely with IF EXISTS.
-- =============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

-- suggestions / investments / savings may not exist yet at this migration's
-- chronological position; add columns when the tables are present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'suggestions'
  ) THEN
    ALTER TABLE public.suggestions
      ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'investments'
  ) THEN
    ALTER TABLE public.investments
      ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'savings'
  ) THEN
    ALTER TABLE public.savings
      ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payments_project_id_idx ON public.payments (project_id);
CREATE INDEX IF NOT EXISTS receipts_project_id_idx ON public.receipts (project_id);
CREATE INDEX IF NOT EXISTS documents_project_id_idx ON public.documents (project_id);
CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON public.chat_messages (project_id);
CREATE INDEX IF NOT EXISTS photos_project_id_idx ON public.photos (project_id);

-- Seed Mubende project for existing land-deal records to reference.
-- created_by / owner_id left null (seed users are inserted after migrations).
INSERT INTO public.projects (
  id,
  title,
  slug,
  description,
  cause,
  type,
  visibility,
  funding_goal_usd,
  funding_raised_usd,
  min_contribution_usd,
  location_name,
  country,
  latitude,
  longitude,
  status,
  tags
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Mubende Land 2026',
  'mubende-land-2026',
  'Land acquisition project in Mubende District, Uganda. Investors fund the purchase with full receipt transparency and site updates.',
  'Secure titled land that anchors long-term community investment and local opportunity in Mubende.',
  'land_acquisition',
  'private',
  300000,
  0,
  10,
  'Mubende District',
  'Uganda',
  0.5833,
  31.3667,
  'active',
  ARRAY['land', 'mubende', '2026']
)
ON CONFLICT (slug) DO NOTHING;
