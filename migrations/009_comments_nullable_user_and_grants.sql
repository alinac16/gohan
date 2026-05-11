-- Admin-added comments use service_role with user_id = NULL (no Supabase Auth user).

alter table public.comments alter column user_id drop not null;

-- Optional: if the FK was ON DELETE CASCADE, you can switch to SET NULL for users who leave:
-- alter table public.comments drop constraint if exists comments_user_id_fkey;
-- alter table public.comments add constraint comments_user_id_fkey
--   foreign key (user_id) references auth.users(id) on delete set null;

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.comments to anon, authenticated;
grant insert on table public.comments to service_role;
