-- Admin recipe tag editor inserts into public.tags with SUPABASE_SERVICE_ROLE_KEY.

grant usage on schema public to service_role;
grant select, insert on table public.tags to service_role;
