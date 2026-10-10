-- =============================================================================
-- Allow photos + media vault rows to attach to projects (not only land deals).
-- =============================================================================

-- Photos: land_id optional when project_id is set
ALTER TABLE public.photos
  ALTER COLUMN land_id DROP NOT NULL;

ALTER TABLE public.photos
  DROP CONSTRAINT IF EXISTS photos_land_or_project_required;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_land_or_project_required
  CHECK (land_id IS NOT NULL OR project_id IS NOT NULL);

COMMENT ON COLUMN public.photos.project_id IS
  'Optional project scope for field/progress photos. Required when land_id is null.';

-- Media vault: add project_id; land_id optional when project set
ALTER TABLE public.media_videos
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id);

CREATE INDEX IF NOT EXISTS media_videos_project_id_idx
  ON public.media_videos (project_id);

ALTER TABLE public.media_videos
  ALTER COLUMN land_id DROP NOT NULL;

ALTER TABLE public.media_videos
  DROP CONSTRAINT IF EXISTS media_videos_land_or_project_required;

ALTER TABLE public.media_videos
  ADD CONSTRAINT media_videos_land_or_project_required
  CHECK (land_id IS NOT NULL OR project_id IS NOT NULL);

COMMENT ON COLUMN public.media_videos.project_id IS
  'Optional project scope for private video vault uploads.';
