-- Edge / ops scripts (UC-01 seed, admin-manage-users) need to upsert public.users.
GRANT SELECT, INSERT, UPDATE ON public.users TO service_role;
