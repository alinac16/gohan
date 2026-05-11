-- ============================================================
-- Gohan Diary — Supabase Schema
-- Run this in the Supabase SQL Editor (SQL Editor → New Query)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Tables ──────────────────────────────────────────────────

create table if not exists public.recipes (
  id          uuid        default uuid_generate_v4() primary key,
  title       text        not null,
  description text,
  ingredients text,
  instructions text,
  image_url   text,
  source_url  text,
  rating      smallint    check (rating between 1 and 5),
  created_at  timestamptz default now() not null,
  created_by  uuid        references auth.users(id) on delete set null
);

create table if not exists public.tags (
  id       uuid default uuid_generate_v4() primary key,
  name     text not null unique,
  category text not null check (category in ('protein', 'complexity', 'time'))
);

create table if not exists public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id    uuid not null references public.tags(id)    on delete cascade,
  primary key (recipe_id, tag_id)
);

create table if not exists public.comments (
  id         uuid        default uuid_generate_v4() primary key,
  recipe_id  uuid        not null references public.recipes(id)  on delete cascade,
  user_id    uuid        references auth.users(id) on delete set null,
  body       text        not null,
  created_at timestamptz default now() not null
);

-- ── Row Level Security ───────────────────────────────────────

alter table public.recipes    enable row level security;
alter table public.tags       enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.comments   enable row level security;

-- recipes: public read; writes via service_role (admin form + env key) or recipe owner
create policy "recipes_select" on public.recipes
  for select using (true);

create policy "recipes_insert" on public.recipes
  for insert with check (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or (auth.uid() is not null and auth.uid() = created_by)
  );

create policy "recipes_update" on public.recipes
  for update
  using (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or auth.uid() = created_by
  )
  with check (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or auth.uid() = created_by
  );

create policy "recipes_delete" on public.recipes
  for delete using (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or auth.uid() = created_by
  );

-- tags: anyone reads, authenticated users can insert
create policy "tags_select" on public.tags
  for select using (true);

create policy "tags_insert" on public.tags
  for insert with check (auth.role() = 'authenticated');

-- recipe_tags: anyone reads, recipe owner manages
create policy "recipe_tags_select" on public.recipe_tags
  for select using (true);

create policy "recipe_tags_insert" on public.recipe_tags
  for insert with check (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and r.created_by is not null
        and r.created_by = auth.uid()
    )
  );

create policy "recipe_tags_delete" on public.recipe_tags
  for delete using (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and r.created_by is not null
        and r.created_by = auth.uid()
    )
  );

-- comments: anyone reads, authenticated users insert their own
create policy "comments_select" on public.comments
  for select using (true);

create policy "comments_insert" on public.comments
  for insert with check (
    auth.role() = 'authenticated' and auth.uid() = user_id
  );

-- ── Grants (admin saves use service_role from SUPABASE_SERVICE_ROLE_KEY) ──

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.recipes to anon, authenticated;
grant select, insert, update, delete on table public.recipes to service_role;
grant select on table public.tags to anon, authenticated;
grant select, insert on table public.tags to service_role;
grant select on table public.recipe_tags to anon, authenticated;
grant select, insert, update, delete on table public.recipe_tags to service_role;
grant select on table public.comments to anon, authenticated;
grant insert on table public.comments to service_role;

-- ── Seed Tags ────────────────────────────────────────────────

insert into public.tags (name, category) values
  ('Beef',         'protein'),
  ('Chicken',      'protein'),
  ('Pork',         'protein'),
  ('Fish',         'protein'),
  ('Seafood',      'protein'),
  ('Tofu',         'protein'),
  ('Vegetarian',   'protein'),
  ('Vegan',        'protein'),
  ('Easy',         'complexity'),
  ('Medium',       'complexity'),
  ('Hard',         'complexity'),
  ('Under 30 min', 'time'),
  ('30–60 min',    'time'),
  ('Over 1 hour',  'time'),
  ('Overnight',    'time')
on conflict (name) do nothing;

-- ── Storage (recipe photos) ─────────────────────────────────
-- Creates a public bucket and policies. Requires Storage enabled on the project.

insert into storage.buckets (id, name, public)
  values ('recipe-images', 'recipe-images', true)
  on conflict (id) do update set public = excluded.public;

-- Allow anon + authenticated reads of objects in this bucket
create policy "Public read recipe images" on storage.objects
  for select using (bucket_id = 'recipe-images');

-- Authenticated users may upload (your app only exposes uploads on /admin/new).
create policy "Auth upload recipe images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-images');

-- Let the uploader replace or remove their own files
create policy "Auth update own recipe images" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-images' and auth.uid() = owner)
  with check (bucket_id = 'recipe-images');

create policy "Auth delete own recipe images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-images' and auth.uid() = owner);
