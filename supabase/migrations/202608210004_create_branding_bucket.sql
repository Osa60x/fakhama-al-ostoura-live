-- Public delivery is intentional for the store logo; writes remain owner-only through storage RLS policies.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = excluded.public;
