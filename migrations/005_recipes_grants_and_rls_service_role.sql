-- Run once in Supabase → SQL Editor (fixes stubborn "permission denied for table recipes").
-- Covers: RLS + explicit GRANTS + JWT role claim (some setups don't set auth.role() the same way).

-- ── Table privileges (safe on Supabase; fixes pure GRANT errors separate from RLS)
grant usage on schema public to anon, authenticated, service_role;

grant select on table public.recipes to anon, authenticated;
grant select, insert, update, delete on table public.recipes to service_role;

grant select on table public.tags to anon, authenticated;
grant select, insert on table public.tags to service_role;
grant select on table public.recipe_tags to anon, authenticated;
grant select, insert, update, delete on table public.recipe_tags to service_role;

grant select on table public.comments to anon, authenticated;
grant insert on table public.comments to service_role;

-- ── Helper expression: admin server uses SUPABASE_SERVICE_ROLE_KEY → JWT role "service_role"
-- Some stacks expose this via auth.role(), others only via auth.jwt()->>'role'.

drop policy if exists "recipes_insert" on public.recipes;
drop policy if exists "recipes_update" on public.recipes;
drop policy if exists "recipes_delete" on public.recipes;

create policy "recipes_insert" on public.recipes
  for insert
  with check (
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
  for delete
  using (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or auth.uid() = created_by
  );

drop policy if exists "recipe_tags_insert" on public.recipe_tags;
drop policy if exists "recipe_tags_delete" on public.recipe_tags;

create policy "recipe_tags_insert" on public.recipe_tags
  for insert
  with check (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.created_by is not null
        and r.created_by = auth.uid()
    )
  );

create policy "recipe_tags_delete" on public.recipe_tags
  for delete
  using (
    coalesce(auth.jwt() ->> 'role', auth.role()::text) = 'service_role'
    or exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.created_by is not null
        and r.created_by = auth.uid()
    )
  );
