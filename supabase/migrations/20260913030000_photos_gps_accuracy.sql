-- Camera captures store the horizontal accuracy reported at the shutter.
-- Only a fix within the 10m proof-of-site target is accepted.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS accuracy_m numeric;

ALTER TABLE public.photos
  DROP CONSTRAINT IF EXISTS photos_accuracy_m_within_10;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_accuracy_m_within_10
  CHECK (accuracy_m IS NULL OR (accuracy_m >= 0 AND accuracy_m <= 10));

COMMENT ON COLUMN public.photos.accuracy_m IS
  'Horizontal GPS accuracy in meters at shutter time. Null for library uploads. Camera photos only store a fix of 10m or better.';
