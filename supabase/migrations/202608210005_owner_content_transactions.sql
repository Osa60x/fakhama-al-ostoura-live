create or replace function public.update_site_settings(p_actor uuid, p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare previous jsonb; next_value jsonb;
begin
  if jsonb_typeof(p_settings) <> 'object' then raise exception 'invalid settings'; end if;
  select to_jsonb(s) into previous from public.site_settings s where s.id = true;
  update public.site_settings set
    site_name = case when p_settings ? 'site_name' then p_settings->>'site_name' else site_name end,
    address = case when p_settings ? 'address' then p_settings->>'address' else address end,
    show_address = case when p_settings ? 'show_address' then (p_settings->>'show_address')::boolean else show_address end,
    palette = case when p_settings ? 'palette' then p_settings->>'palette' else palette end,
    theme_mode = case when p_settings ? 'theme_mode' then p_settings->>'theme_mode' else theme_mode end,
    title_font = case when p_settings ? 'title_font' then p_settings->>'title_font' else title_font end,
    title_size = case when p_settings ? 'title_size' then (p_settings->>'title_size')::smallint else title_size end,
    title_weight = case when p_settings ? 'title_weight' then (p_settings->>'title_weight')::smallint else title_weight end,
    title_color = case when p_settings ? 'title_color' then p_settings->>'title_color' else title_color end,
    subtitle_size = case when p_settings ? 'subtitle_size' then (p_settings->>'subtitle_size')::smallint else subtitle_size end,
    subtitle_weight = case when p_settings ? 'subtitle_weight' then (p_settings->>'subtitle_weight')::smallint else subtitle_weight end,
    subtitle_color = case when p_settings ? 'subtitle_color' then p_settings->>'subtitle_color' else subtitle_color end,
    chart_visible = case when p_settings ? 'chart_visible' then (p_settings->>'chart_visible')::boolean else chart_visible end,
    chart_default_range = case when p_settings ? 'chart_default_range' then p_settings->>'chart_default_range' else chart_default_range end,
    chart_mode = case when p_settings ? 'chart_mode' then p_settings->>'chart_mode' else chart_mode end,
    updated_by = p_actor, updated_at = now()
  where id = true;
  select to_jsonb(s) into next_value from public.site_settings s where s.id = true;
  insert into public.audit_logs(actor_id, actor_role, action, entity_type, before_value, after_value)
  values (p_actor, 'owner', 'site_settings_updated', 'site_settings', previous, next_value);
end;
$$;
revoke all on function public.update_site_settings(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_site_settings(uuid, jsonb) to service_role;

create or replace function public.replace_contact_links(p_actor uuid, p_contacts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare previous jsonb; next_value jsonb;
begin
  if jsonb_typeof(p_contacts) <> 'array' or jsonb_array_length(p_contacts) > 8 then raise exception 'invalid contacts'; end if;
  if exists (select 1 from jsonb_to_recordset(p_contacts) as x(kind text, label text, value text, sort_order smallint, is_active boolean)
    where x.kind not in ('whatsapp','phone','instagram','snapchat','telegram','email')
      or x.label is null or char_length(x.label) not between 2 and 32
      or x.value is null or char_length(x.value) not between 3 and 512
      or coalesce(x.sort_order, 0) not between 0 and 20) then raise exception 'invalid contacts'; end if;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.id), '[]'::jsonb) into previous from public.contact_links c;
  delete from public.contact_links;
  insert into public.contact_links(kind, label, value, sort_order, is_active, updated_by)
  select x.kind::public.contact_kind, x.label, x.value, coalesce(x.sort_order, 0), coalesce(x.is_active, true), p_actor
  from jsonb_to_recordset(p_contacts) as x(kind text, label text, value text, sort_order smallint, is_active boolean);
  select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.id), '[]'::jsonb) into next_value from public.contact_links c;
  insert into public.audit_logs(actor_id, actor_role, action, entity_type, before_value, after_value)
  values (p_actor, 'owner', 'contact_links_replaced', 'contact_links', previous, next_value);
end;
$$;
revoke all on function public.replace_contact_links(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_contact_links(uuid, jsonb) to service_role;
