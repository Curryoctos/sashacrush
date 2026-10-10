-- Fix: table had RLS but no privileges for authenticated clients.

GRANT SELECT, INSERT ON public.investor_consents TO authenticated;
GRANT SELECT ON public.investor_consents TO service_role;
