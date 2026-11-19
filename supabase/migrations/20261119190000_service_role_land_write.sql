-- UC-01 seed / ops: service_role must upsert land_records (edge uses SELECT only).
GRANT SELECT, INSERT, UPDATE ON public.land_records TO service_role;
