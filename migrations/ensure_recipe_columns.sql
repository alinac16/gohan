-- Run this ONCE in Supabase → SQL Editor → New query, then Run.
-- Fixes "Could not find the 'source_url' / 'ingredients' column" / schema cache errors
-- when your live DB was created before those columns existed.

alter table public.recipes add column if not exists source_url text;
alter table public.recipes add column if not exists ingredients text;

comment on column public.recipes.source_url is 'Original recipe link when adapted from the web';
comment on column public.recipes.ingredients is 'One ingredient per line; quantities + units for scaling';
