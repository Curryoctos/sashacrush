-- Sprint 7: table grants for payment/receipt writes, audit log reads, executive deal summaries

GRANT INSERT, UPDATE ON public.payments TO authenticated;
GRANT INSERT ON public.receipts TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.executive_deal_summaries()
RETURNS TABLE (
  land_id uuid,
  title text,
  location text,
  status text,
  total_value_usd numeric,
  seller_name text,
  pending_docs bigint,
  signed_docs bigint,
  confirmed_payments bigint,
  pending_payments bigint
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
    lr.total_value_usd,
    COALESCE(u.full_name, u.email) AS seller_name,
    COUNT(d.id) FILTER (WHERE d.status = 'sent') AS pending_docs,
    COUNT(d.id) FILTER (WHERE d.status = 'signed') AS signed_docs,
    COUNT(p.id) FILTER (WHERE p.status = 'confirmed') AS confirmed_payments,
    COUNT(p.id) FILTER (WHERE p.status <> 'confirmed') AS pending_payments
  FROM public.land_records lr
  LEFT JOIN public.users u ON u.id = lr.seller_id
  LEFT JOIN public.documents d ON d.land_id = lr.id
  LEFT JOIN public.payments p ON p.land_id = lr.id
  WHERE public.current_user_role() = 'executive'
  GROUP BY lr.id, lr.title, lr.location, lr.status, lr.total_value_usd, u.full_name, u.email
  ORDER BY lr.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.executive_deal_summaries() TO authenticated;

CREATE OR REPLACE FUNCTION public.executive_deal_summary(p_land_id uuid)
RETURNS TABLE (
  land_id uuid,
  title text,
  location text,
  status text,
  total_value_usd numeric,
  seller_name text,
  pending_docs bigint,
  signed_docs bigint,
  confirmed_payments bigint,
  pending_payments bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.executive_deal_summaries()
  WHERE land_id = p_land_id;
$$;

GRANT EXECUTE ON FUNCTION public.executive_deal_summary(uuid) TO authenticated;
