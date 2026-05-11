-- Fixes empty landing page when listing recipes with nested tags: anon must SELECT public.tags.
-- Without this, PostgREST returns an error for embeds like recipe_tags(tags(...)), and data is empty.

grant usage on schema public to anon, authenticated;

grant select on table public.tags to anon, authenticated;
