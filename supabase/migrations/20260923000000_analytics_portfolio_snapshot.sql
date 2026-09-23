-- C-19: portfolio analytics snapshot for admin / executive / agent (not seller).
-- SECURITY DEFINER so executives can see aggregates without table-level SELECT on payments.

CREATE OR REPLACE FUNCTION public.analytics_portfolio_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role text := public.current_user_role();
  result jsonb;
BEGIN
  IF role IS NULL OR role NOT IN ('admin', 'executive', 'agent') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'deals', COALESCE((
      SELECT jsonb_agg(row_to_json(d) ORDER BY d.title)
      FROM (
        SELECT
          lr.id AS land_id,
          lr.title,
          lr.status,
          lr.total_value_usd::float8 AS total_value_usd,
          lr.created_at,
          COALESCE(SUM(p.amount_usd) FILTER (WHERE p.status = 'confirmed'), 0)::float8 AS paid_usd,
          COALESCE(
            SUM(p.amount_usd) FILTER (WHERE p.status IN ('pending', 'pending_manual')),
            0
          )::float8 AS pending_usd,
          MAX(p.created_at) AS last_payment_at,
          (
            SELECT COUNT(*)::int
            FROM public.photos ph
            WHERE ph.land_id = lr.id
          ) AS photo_count
        FROM public.land_records lr
        LEFT JOIN public.payments p ON p.land_id = lr.id
        WHERE lr.status IS DISTINCT FROM 'archived'
        GROUP BY lr.id, lr.title, lr.status, lr.total_value_usd, lr.created_at
      ) d
    ), '[]'::jsonb),
    'payments_monthly', COALESCE((
      SELECT jsonb_agg(row_to_json(m) ORDER BY m.month)
      FROM (
        SELECT
          to_char(date_trunc('month', p.created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(p.amount_usd) FILTER (WHERE p.status = 'confirmed'), 0)::float8 AS paid_usd,
          COUNT(*)::int AS payment_count
        FROM public.payments p
        WHERE p.created_at >= (date_trunc('month', now()) - interval '11 months')
        GROUP BY date_trunc('month', p.created_at)
      ) m
    ), '[]'::jsonb),
    'photos_monthly', COALESCE((
      SELECT jsonb_agg(row_to_json(m) ORDER BY m.month)
      FROM (
        SELECT
          to_char(date_trunc('month', ph.captured_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS photo_count
        FROM public.photos ph
        WHERE ph.captured_at >= (date_trunc('month', now()) - interval '11 months')
        GROUP BY date_trunc('month', ph.captured_at)
      ) m
    ), '[]'::jsonb),
    'documents', COALESCE((
      SELECT jsonb_build_object(
        'draft', COUNT(*) FILTER (WHERE d.status = 'draft'),
        'sent', COUNT(*) FILTER (WHERE d.status = 'sent'),
        'signed', COUNT(*) FILTER (WHERE d.status = 'signed'),
        'archived', COUNT(*) FILTER (WHERE d.status = 'archived')
      )
      FROM public.documents d
      WHERE d.land_id IS NOT NULL
    ), jsonb_build_object('draft', 0, 'sent', 0, 'signed', 0, 'archived', 0))
  )
  INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.analytics_portfolio_snapshot() IS
  'C-19 portfolio chart data for staff roles (admin, executive, agent).';

GRANT EXECUTE ON FUNCTION public.analytics_portfolio_snapshot() TO authenticated;
