insert into public.tags (name, category) values ('Overnight', 'time')
on conflict (name) do nothing;
