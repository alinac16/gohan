-- Run once in Supabase SQL Editor.
-- Fixes "permission denied for table recipes" when saving from /admin/new with SUPABASE_SERVICE_ROLE_KEY.
-- Previous policies only allowed insert when auth.uid() = created_by; admin inserts use created_by = null.

drop policy if exists "recipes_insert" on public.recipes;
drop policy if exists "recipes_update" on public.recipes;
drop policy if exists "recipes_delete" on public.recipes;

create policy "recipes_insert" on public.recipes
  for insert
  with check (
    auth.role() = 'service_role'
    or (auth.uid() is not null and auth.uid() = created_by)
  );

create policy "recipes_update" on public.recipes
  for update
  using (
    auth.role() = 'service_role'
    or auth.uid() = created_by
  )
  with check (
    auth.role() = 'service_role'
    or auth.uid() = created_by
  );

create policy "recipes_delete" on public.recipes
  for delete
  using (
    auth.role() = 'service_role'
    or auth.uid() = created_by
  );

-- Tag rows after insert: allow service_role, or recipe owned by current user
drop policy if exists "recipe_tags_insert" on public.recipe_tags;
drop policy if exists "recipe_tags_delete" on public.recipe_tags;

create policy "recipe_tags_insert" on public.recipe_tags
  for insert
  with check (
    auth.role() = 'service_role'
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
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.created_by is not null
        and r.created_by = auth.uid()
    )
  );
