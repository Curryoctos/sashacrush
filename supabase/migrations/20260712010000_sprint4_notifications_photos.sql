-- Sprint 4: webhook idempotency + photos storage bucket

CREATE TABLE public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- No client policies — edge functions use service role only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "photos_storage_admin_agent_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.has_role(ARRAY['admin', 'agent'])
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND public.has_role(ARRAY['admin', 'agent'])
  );

CREATE POLICY "photos_storage_seller_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.current_user_role() = 'seller'
    AND EXISTS (
      SELECT 1
      FROM public.photos p
      WHERE p.file_path = storage.objects.name
        AND public.is_seller_of_land(p.land_id)
    )
  );

CREATE POLICY "photos_storage_seller_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND public.current_user_role() = 'seller'
    AND EXISTS (
      SELECT 1
      FROM public.photos p
      WHERE p.file_path = storage.objects.name
        AND public.is_seller_of_land(p.land_id)
        AND p.uploader_id = auth.uid()
    )
  );
