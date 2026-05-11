-- Run once in Supabase SQL Editor if `ingredients` is missing from `recipes`.
alter table public.recipes add column if not exists ingredients text;

comment on column public.recipes.ingredients is 'One ingredient per line; quantities + units for scaling on the recipe page';
