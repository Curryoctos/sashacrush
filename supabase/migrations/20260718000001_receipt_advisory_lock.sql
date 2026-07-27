-- Exposes pg_advisory_xact_lock as an RPC callable
-- by service_role inside edge functions.
-- Prevents duplicate receipt numbers under concurrent payments.

create or replace function public.get_advisory_lock(lock_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  perform pg_advisory_xact_lock(lock_id);
end;
$$;

-- Only service_role can call this — not anon or authenticated
revoke execute on function public.get_advisory_lock from public;
revoke execute on function public.get_advisory_lock from authenticated;
grant execute on function public.get_advisory_lock to service_role;
