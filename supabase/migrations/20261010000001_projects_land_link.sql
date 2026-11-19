-- =============================================================================
-- Link funding projects to land deal workspaces (optional FK).
-- One land record may have at most one linked project; payments can carry both ids.
-- =============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS land_id uuid REFERENCES public.land_records (id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.land_id IS
  'Optional land deal this funding/purchase project is tied to (typically land_acquisition).';

CREATE UNIQUE INDEX IF NOT EXISTS projects_land_id_unique
  ON public.projects (land_id)
  WHERE land_id IS NOT NULL;

-- Backfill from migration-era slugs: land-{uuid without dashes}
UPDATE public.projects p
SET land_id = lr.id
FROM public.land_records lr
WHERE p.land_id IS NULL
  AND p.slug = 'land-' || replace(lr.id::text, '-', '');

-- Backfill when a single project already receives that land's payments
UPDATE public.projects p
SET land_id = matched.land_id
FROM (
  SELECT pay.project_id, pay.land_id
  FROM public.payments pay
  WHERE pay.land_id IS NOT NULL
    AND pay.project_id IS NOT NULL
  GROUP BY pay.project_id, pay.land_id
) matched
WHERE p.id = matched.project_id
  AND p.land_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.projects other
    WHERE other.land_id = matched.land_id
  );
