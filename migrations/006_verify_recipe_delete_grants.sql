-- Recipe delete from the site uses the server-only Supabase client with
-- SUPABASE_SERVICE_ROLE_KEY (same as /admin/new). That role bypasses RLS but still
-- needs table privileges.
--
-- If you already ran schema.sql or 005_recipes_grants_and_rls_service_role.sql,
-- DELETE on public.recipes for service_role is already granted — nothing else required.
--
-- Use this only if delete fails with “permission denied for table recipes”:

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.recipes to service_role;
grant select, insert, update, delete on table public.recipe_tags to service_role;

-- RLS policy "recipes_delete" (owner or service_role) is defined in 005; optional for
-- service_role API calls since service_role bypasses RLS, but keep policies for consistency.

-- Cascades: recipe_tags and comments reference recipes(id) ON DELETE CASCADE, so one
-- DELETE on recipes removes related rows automatically. No separate DELETE on comments needed.
