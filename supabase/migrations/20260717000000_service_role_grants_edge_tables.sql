-- Edge Functions use the PostgREST service_role role; tables need explicit GRANTs.
-- RLS is bypassed for service_role, but PostgreSQL table privileges are still required.

GRANT SELECT ON public.users TO service_role;
GRANT SELECT ON public.land_records TO service_role;
GRANT SELECT ON public.payments TO service_role;
GRANT SELECT ON public.receipts TO service_role;
GRANT SELECT ON public.documents TO service_role;
GRANT SELECT ON public.chat_messages TO service_role;

GRANT SELECT, INSERT ON public.rate_limit_events TO service_role;
GRANT SELECT, INSERT ON public.notification_events TO service_role;
