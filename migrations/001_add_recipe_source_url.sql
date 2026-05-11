-- Run once in Supabase SQL Editor if your `recipes` table predates `source_url`.
alter table public.recipes add column if not exists source_url text;

comment on column public.recipes.source_url is 'Original recipe link when adapted from the web';
