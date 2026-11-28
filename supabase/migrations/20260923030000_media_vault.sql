-- C-22 Video & Media Vault — Admin upload, Admin + Executive playback, Seller blocked.

CREATE TABLE public.media_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id uuid NOT NULL REFERENCES public.land_records (id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.users (id),
  title text NOT NULL,
  land_title text NOT NULL,
  file_path text NOT NULL UNIQUE,
  mime_type text NOT NULL
    CHECK (mime_type IN ('video/mp4', 'video/quicktime')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 524288000),
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX media_videos_land_id_idx ON public.media_videos (land_id, captured_at DESC);

COMMENT ON TABLE public.media_videos IS
  'C-22 project / site videos. Private media bucket; signed URL playback only.';

ALTER TABLE public.media_videos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.media_videos TO authenticated;

CREATE POLICY "media_videos_admin_all"
  ON public.media_videos
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (
    public.current_user_role() = 'admin'
    AND uploader_id = auth.uid()
  );

CREATE POLICY "media_videos_executive_select"
  ON public.media_videos
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'executive');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  524288000,
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "media_storage_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'media'
    AND public.current_user_role() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'media'
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "media_storage_executive_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'media'
    AND public.current_user_role() = 'executive'
    AND EXISTS (
      SELECT 1
      FROM public.media_videos mv
      WHERE mv.file_path = storage.objects.name
    )
  );
