-- فخامة الأسطورة: إزالة وضع الفاتح/الداكن/حسب الجهاز واعتماد ثلاث ثيمات متجر فقط.
-- لا تعتمد هذه الهجرة على أي مشروع آخر.

drop view if exists public.public_dashboard;

update public.site_settings
set palette = 'navy_gold'
where palette = 'black_gold';

alter table public.site_settings
  drop constraint if exists site_settings_palette_check,
  add constraint site_settings_palette_check
    check (palette in ('gold_cream', 'emerald_gold', 'navy_gold'));

alter table public.site_settings
  drop column if exists theme_mode;

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

create or replace view public.public_dashboard with (security_invoker = true) as
select
  s.site_name,
  s.address,
  s.show_address,
  s.logo_path,
  s.logo_size,
  s.palette,
  s.title_font,
  s.title_size,
  s.title_weight,
  s.title_color,
  s.subtitle_size,
  s.subtitle_weight,
  s.subtitle_color,
  s.chart_visible,
  s.chart_default_range,
  s.chart_mode,
  latest.xau_usd,
  latest.usd_sar,
  latest.final_24_sar,
  latest.final_21_sar,
  latest.final_18_sar,
  latest.fetched_at,
  runtime.last_status,
  runtime.last_successful_at
from public.site_settings s
left join lateral (
  select xau_usd, usd_sar, final_24_sar, final_21_sar, final_18_sar, fetched_at
  from public.price_snapshots
  order by fetched_at desc
  limit 1
) latest on true
left join public.price_runtime_status runtime on runtime.id = true;
grant select on public.public_dashboard to anon, authenticated;
