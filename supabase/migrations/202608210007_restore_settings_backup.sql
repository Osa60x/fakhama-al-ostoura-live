create or replace function public.restore_settings_backup(
  p_actor uuid,
  p_settings jsonb,
  p_contacts jsonb,
  p_adjustments jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare previous jsonb; next_value jsonb;
begin
  select jsonb_build_object(
    'settings', to_jsonb(s),
    'contacts', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order) from public.contact_links c), '[]'::jsonb),
    'adjustments', coalesce((select jsonb_agg(to_jsonb(a) order by a.carat) from public.price_adjustments a), '[]'::jsonb)
  ) into previous from public.site_settings s where s.id = true;

  update public.site_settings set
    site_name = coalesce(p_settings->>'site_name', site_name),
    address = coalesce(p_settings->>'address', address),
    show_address = coalesce((p_settings->>'show_address')::boolean, show_address),
    palette = coalesce(p_settings->>'palette', palette),
    theme_mode = coalesce(p_settings->>'theme_mode', theme_mode),
    title_font = coalesce(p_settings->>'title_font', title_font),
    title_size = coalesce((p_settings->>'title_size')::smallint, title_size),
    title_weight = coalesce((p_settings->>'title_weight')::smallint, title_weight),
    title_color = coalesce(p_settings->>'title_color', title_color),
    subtitle_size = coalesce((p_settings->>'subtitle_size')::smallint, subtitle_size),
    subtitle_weight = coalesce((p_settings->>'subtitle_weight')::smallint, subtitle_weight),
    subtitle_color = coalesce(p_settings->>'subtitle_color', subtitle_color),
    chart_visible = coalesce((p_settings->>'chart_visible')::boolean, chart_visible),
    chart_default_range = coalesce(p_settings->>'chart_default_range', chart_default_range),
    chart_mode = coalesce(p_settings->>'chart_mode', chart_mode),
    updated_by = p_actor,
    updated_at = now()
  where id = true;

  delete from public.contact_links;
  insert into public.contact_links(kind, label, value, sort_order, is_active, updated_by)
  select kind::public.contact_kind, label, value, sort_order, is_active, p_actor
  from jsonb_to_recordset(p_contacts) as item(kind text, label text, value text, sort_order smallint, is_active boolean);

  update public.price_adjustments current set
    adjustment_sar = incoming.adjustment_sar,
    updated_by = p_actor,
    updated_at = now()
  from jsonb_to_recordset(p_adjustments) as incoming(carat text, adjustment_sar numeric)
  where current.carat = incoming.carat;

  select jsonb_build_object(
    'settings', to_jsonb(s),
    'contacts', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order) from public.contact_links c), '[]'::jsonb),
    'adjustments', coalesce((select jsonb_agg(to_jsonb(a) order by a.carat) from public.price_adjustments a), '[]'::jsonb)
  ) into next_value from public.site_settings s where s.id = true;
  insert into public.audit_logs(actor_id, actor_role, action, entity_type, before_value, after_value)
  values (p_actor, 'owner', 'settings_imported', 'settings_backup', previous, next_value);
end;
$$;
revoke all on function public.restore_settings_backup(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.restore_settings_backup(uuid, jsonb, jsonb, jsonb) to service_role;
