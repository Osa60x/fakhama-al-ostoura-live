create or replace function public.set_logo_path(p_actor uuid, p_logo_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare previous jsonb; next_value jsonb;
begin
  if p_logo_path !~ '^logos/[a-f0-9-]{36}\.png$' then raise exception 'invalid logo path'; end if;
  select to_jsonb(s) into previous from public.site_settings s where s.id = true;
  update public.site_settings set logo_path = p_logo_path, updated_by = p_actor, updated_at = now() where id = true;
  select to_jsonb(s) into next_value from public.site_settings s where s.id = true;
  insert into public.audit_logs(actor_id, actor_role, action, entity_type, before_value, after_value)
  values (p_actor, 'owner', 'logo_updated', 'site_settings', previous, next_value);
end;
$$;
revoke all on function public.set_logo_path(uuid, text) from public, anon, authenticated;
grant execute on function public.set_logo_path(uuid, text) to service_role;
