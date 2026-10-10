-- Read-only parcel geometry for executives. They cannot SELECT land_records directly.

CREATE OR REPLACE FUNCTION public.executive_land_map()
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
  ORDER BY lr.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.executive_land_map() TO authenticated;
