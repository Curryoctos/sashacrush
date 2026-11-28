-- Public showcase listings so the live browse page is not empty (MSDP G-01 / C-03).
-- Idempotent on slug. Does not invent fake paid receipts.

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
  tags,
  land_id
)
VALUES
  (
    'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
    'Mubende Land Acquisition',
    'mubende-land',
    'Cross-border land acquisition for the Mubende parcel — partial payments, receipts, and title progress tracked in SashaCrush.',
    'Secure and clear title for the $300,000 Mubende land deal.',
    'land_acquisition',
    'public',
    300000,
    0,
    25,
    'Mubende District, Uganda',
    'Uganda',
    0.5605,
    31.3950,
    'active',
    ARRAY['land', 'mubende', 'uganda'],
    NULL
  ),
  (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    'Mubende Community School Wing',
    'mubende-school-wing',
    'Build classroom capacity near the Mubende site so families around the land deal share lasting local benefit.',
    'Fund a new school wing with transparent milestone updates.',
    'education',
    'public',
    45000,
    0,
    10,
    'Mubende District, Uganda',
    'Uganda',
    0.5620,
    31.3970,
    'active',
    ARRAY['education', 'community', 'uganda'],
    NULL
  ),
  (
    'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    'Central Uganda Cooperative Farm',
    'uganda-cooperative-farm',
    'Expand irrigation and storage for a smallholder cooperative — field photos and receipts on every disbursement.',
    'Grow food security with accountable community funding.',
    'agriculture',
    'public',
    28000,
    0,
    10,
    'Kassanda, Uganda',
    'Uganda',
    0.5510,
    31.4200,
    'active',
    ARRAY['agriculture', 'cooperative', 'uganda'],
    NULL
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cause = EXCLUDED.cause,
  type = EXCLUDED.type,
  visibility = 'public',
  funding_goal_usd = EXCLUDED.funding_goal_usd,
  min_contribution_usd = EXCLUDED.min_contribution_usd,
  location_name = EXCLUDED.location_name,
  country = EXCLUDED.country,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  status = EXCLUDED.status,
  tags = EXCLUDED.tags,
  updated_at = now();

-- Link Mubende project only when the land record already exists (local seed / prod).
UPDATE public.projects p
SET land_id = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
WHERE p.slug = 'mubende-land'
  AND EXISTS (
    SELECT 1 FROM public.land_records lr
    WHERE lr.id = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
  );
