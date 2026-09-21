-- Investors (executive role): read-only site map + field photos.
-- They still cannot SELECT land_records directly; site geometry comes from an RPC.

CREATE OR REPLACE FUNCTION public.executive_land_site(p_land_id uuid)
RETURNS TABLE (
  land_id uuid,
  title text,
  location text,
  status text,
  latitude numeric,
  longitude numeric,
  boundary_geojson jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lr.id AS land_id,
    lr.title,
    lr.location,
    lr.status,
    lr.latitude,
    lr.longitude,
    lr.boundary_geojson
  FROM public.land_records lr
  WHERE public.current_user_role() = 'executive'
    AND lr.id = p_land_id;
$$;

GRANT EXECUTE ON FUNCTION public.executive_land_site(uuid) TO authenticated;

CREATE POLICY "photos_executive_select"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'executive');

CREATE POLICY "photos_storage_executive_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.current_user_role() = 'executive'
  );
