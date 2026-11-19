-- Seed data for local development (SashaCrush)
-- Password for all dev accounts: changeme-local-only
-- Roles are assigned ONLY in public.users — never user-selectable at signup.

-- Admin
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'admin@sashacrush.com', crypt('changeme-local-only', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"SashaCrush Admin"}',
  now(), now(), '', '', '', ''
);
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","email":"admin@sashacrush.com"}'::jsonb,
  'email', now(), now(), now()
);
INSERT INTO public.users (id, email, role, full_name)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@sashacrush.com', 'admin', 'SashaCrush Admin');

-- Executive
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'executive@sashacrush.com', crypt('changeme-local-only', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"SashaCrush Executive"}',
  now(), now(), '', '', '', ''
);
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  '{"sub":"b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22","email":"executive@sashacrush.com"}'::jsonb,
  'email', now(), now(), now()
);
INSERT INTO public.users (id, email, role, full_name)
VALUES ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'executive@sashacrush.com', 'executive', 'SashaCrush Executive');

-- Agent
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'agent@sashacrush.com', crypt('changeme-local-only', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"SashaCrush Agent"}',
  now(), now(), '', '', '', ''
);
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  '{"sub":"c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33","email":"agent@sashacrush.com"}'::jsonb,
  'email', now(), now(), now()
);
INSERT INTO public.users (id, email, role, full_name)
VALUES ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'agent@sashacrush.com', 'agent', 'SashaCrush Agent');

-- Seller (magic link in UI; password set for local dev / automated tests only)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'seller@sashacrush.com', crypt('changeme-local-only', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Mubende Seller"}',
  now(), now(), '', '', '', ''
);
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  '{"sub":"d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44","email":"seller@sashacrush.com"}'::jsonb,
  'email', now(), now(), now()
);
INSERT INTO public.users (id, email, role, full_name)
VALUES ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'seller@sashacrush.com', 'seller', 'Mubende Seller');

-- Second seller (no land assigned — used for RLS isolation tests)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'seller2@sashacrush.com', crypt('changeme-local-only', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Unassigned Seller"}',
  now(), now(), '', '', '', ''
);
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
  'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
  '{"sub":"f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66","email":"seller2@sashacrush.com"}'::jsonb,
  'email', now(), now(), now()
);
INSERT INTO public.users (id, email, role, full_name)
VALUES ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'seller2@sashacrush.com', 'seller', 'Unassigned Seller');

-- Mubende land deal (coords + sample boundary for C-12 map)
INSERT INTO public.land_records (
  id, title, location, total_value_usd, seller_id, status,
  latitude, longitude, boundary_geojson
)
VALUES (
  'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  'Mubende Land',
  'Mubende District, Uganda',
  300000,
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  'active',
  0.5605,
  31.3950,
  '{
    "type": "Polygon",
    "coordinates": [[
      [31.3900, 0.5570],
      [31.4000, 0.5570],
      [31.4000, 0.5640],
      [31.3900, 0.5640],
      [31.3900, 0.5570]
    ]]
  }'::jsonb
);

-- Land-linked funding project (payments.project_id is required)
INSERT INTO public.projects (
  id, title, slug, description, cause, type, visibility,
  funding_goal_usd, funding_raised_usd, min_contribution_usd,
  location_name, country, latitude, longitude, status, tags, land_id
)
VALUES (
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
  'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
);

INSERT INTO public.projects (
  id, title, slug, description, cause, type, visibility,
  funding_goal_usd, funding_raised_usd, min_contribution_usd,
  location_name, country, latitude, longitude, status, tags
)
VALUES
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
  ARRAY['education', 'community', 'uganda']
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
  ARRAY['agriculture', 'cooperative', 'uganda']
);

-- Payment record — sellers must NEVER see this via RLS
INSERT INTO public.payments (
  land_id, project_id, amount_usd, amount_ugx, method, status, disbursement_reason
)
VALUES (
  'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  'a4eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
  50000,
  185000000,
  'manual',
  'pending',
  'Seed pending seller disbursement for Mubende land acquisition'
);
