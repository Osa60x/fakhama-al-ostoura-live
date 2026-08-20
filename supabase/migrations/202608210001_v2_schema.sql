-- فخامة الأسطورة V2. Migration مستقلة؛ لا تطبق على V1 أو Manus.
create extension if not exists pgcrypto;

create schema if not exists private;

create type public.app_role as enum ('owner', 'manager', 'user');
create type public.contact_kind as enum ('whatsapp', 'phone', 'instagram', 'snapchat', 'telegram', 'email');
create type public.runtime_health as enum ('ok', 'error', 'unavailable');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 120),
  role public.app_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'فخامة الأسطورة للذهب والمجوهرات' check (char_length(site_name) between 2 and 64),
  address text not null default 'الرياض - النسيم - أسواق حجاب - مقابل الجامع' check (char_length(address) between 2 and 160),
  show_address boolean not null default true,
  logo_path text,
  logo_size smallint not null default 52 check (logo_size between 32 and 96),
  palette text not null default 'gold_cream' check (palette in ('gold_cream', 'black_gold', 'emerald_gold', 'navy_gold')),
  theme_mode text not null default 'system' check (theme_mode in ('light', 'dark', 'system')),
  title_font text not null default 'Cairo' check (title_font in ('Cairo', 'Tajawal', 'Noto Kufi Arabic')),
  title_size smallint not null default 34 check (title_size between 24 and 48),
  title_weight smallint not null default 800 check (title_weight in (600, 700, 800)),
  title_color text not null default '#624519' check (title_color ~ '^#[0-9A-Fa-f]{6}$'),
  subtitle_size smallint not null default 15 check (subtitle_size between 12 and 22),
  subtitle_weight smallint not null default 500 check (subtitle_weight in (400, 500, 600)),
  subtitle_color text not null default '#6B6255' check (subtitle_color ~ '^#[0-9A-Fa-f]{6}$'),
  chart_visible boolean not null default true,
  chart_default_range text not null default 'day' check (chart_default_range in ('day', 'week', 'month')),
  chart_mode text not null default 'line' check (chart_mode in ('line', 'area')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.contact_links (
  id uuid primary key default gen_random_uuid(),
  kind public.contact_kind not null,
  label text not null check (char_length(label) between 2 and 32),
  value text not null check (char_length(value) between 3 and 512),
  sort_order smallint not null default 0 check (sort_order between 0 and 20),
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, value)
);

create table public.price_adjustments (
  carat text primary key check (carat in ('24', '21', '18')),
  adjustment_sar numeric(10, 2) not null default 0 check (adjustment_sar between -5000 and 5000),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  minute_bucket timestamptz not null,
  xau_usd numeric(16, 6) not null check (xau_usd > 0),
  usd_sar numeric(8, 4) not null default 3.75 check (usd_sar > 0),
  market_24_sar numeric(12, 4) not null check (market_24_sar > 0),
  market_21_sar numeric(12, 4) not null check (market_21_sar > 0),
  market_18_sar numeric(12, 4) not null check (market_18_sar > 0),
  final_24_sar numeric(12, 4) not null check (final_24_sar > 0),
  final_21_sar numeric(12, 4) not null check (final_21_sar > 0),
  final_18_sar numeric(12, 4) not null check (final_18_sar > 0),
  source_name text not null check (char_length(source_name) between 2 and 80),
  source_updated_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  unique (minute_bucket)
);
create index price_snapshots_fetched_at_desc_idx on public.price_snapshots (fetched_at desc);

create table public.price_runtime_status (
  id boolean primary key default true check (id),
  last_status public.runtime_health not null default 'unavailable',
  last_attempt_at timestamptz,
  last_successful_at timestamptz,
  last_error_code text check (last_error_code in ('source_unavailable', 'invalid_payload', 'storage_failed', 'unconfigured')),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  actor_role public.app_role,
  action text not null check (char_length(action) between 3 and 80),
  entity_type text not null check (char_length(entity_type) between 3 and 80),
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_desc_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);

create table public.manager_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 5 and 320),
  is_active boolean not null default true,
  invited_by uuid not null references public.profiles(id),
  claimed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.backup_exports (
  id uuid primary key default gen_random_uuid(),
  schema_version text not null,
  object_path text not null,
  checksum_sha256 text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;
insert into public.price_runtime_status (id) values (true) on conflict (id) do nothing;
insert into public.price_adjustments (carat) values ('24'), ('21'), ('18') on conflict (carat) do nothing;

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_links enable row level security;
alter table public.price_adjustments enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.price_runtime_status enable row level security;
alter table public.audit_logs enable row level security;
alter table public.manager_invites enable row level security;
alter table public.backup_exports enable row level security;

-- Public data is deliberately read-only. All administrative writes go through Worker endpoints.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.site_settings, public.contact_links, public.price_snapshots, public.price_runtime_status to anon, authenticated;
grant select on public.profiles, public.audit_logs, public.manager_invites, public.backup_exports to authenticated;

create policy "public reads site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "public reads active contact links" on public.contact_links for select to anon, authenticated using (is_active);
create policy "public reads price snapshots" on public.price_snapshots for select to anon, authenticated using (true);
create policy "public reads non-sensitive runtime health" on public.price_runtime_status for select to anon, authenticated using (true);
create policy "users read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));

create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.is_active = true
$$;

create policy "owner reads audit logs" on public.audit_logs for select to authenticated using ((select private.current_role()) = 'owner');
create policy "owner reads manager invites" on public.manager_invites for select to authenticated using ((select private.current_role()) = 'owner');
create policy "owner reads backup metadata" on public.backup_exports for select to authenticated using ((select private.current_role()) = 'owner');

-- security_invoker prevents this view from bypassing RLS for browser requests.
create or replace view public.public_dashboard with (security_invoker = true) as
select
  s.site_name,
  s.address,
  s.show_address,
  s.logo_path,
  s.logo_size,
  s.palette,
  s.theme_mode,
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

-- Storage policies are applied after creating a bucket named `branding` in Supabase Storage.
-- The Worker validates MIME, file size and dimensions; the browser never receives a service key.
create policy "owner uploads branding assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'branding' and (select private.current_role()) = 'owner');
create policy "owner updates branding assets"
on storage.objects for update to authenticated
using (bucket_id = 'branding' and (select private.current_role()) = 'owner')
with check (bucket_id = 'branding' and (select private.current_role()) = 'owner');
create policy "owner deletes branding assets"
on storage.objects for delete to authenticated
using (bucket_id = 'branding' and (select private.current_role()) = 'owner');

-- Worker-only RPC: only service_role can execute; Worker verifies the user's JWT and role before calling.
create or replace function public.apply_price_adjustments(
  p_actor uuid,
  p_actor_role public.app_role,
  p_adjustments jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  next_value jsonb;
begin
  if p_actor_role not in ('owner', 'manager') then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_adjustments) <> 'array' or jsonb_array_length(p_adjustments) between 1 and 3 is false then raise exception 'invalid adjustments'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_adjustments) as x(carat text, adjustment_sar numeric)
    where x.carat not in ('24', '21', '18') or x.adjustment_sar is null or x.adjustment_sar not between -5000 and 5000
  ) then raise exception 'invalid adjustments'; end if;

  select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into previous from public.price_adjustments a;
  update public.price_adjustments a
  set adjustment_sar = x.adjustment_sar, updated_by = p_actor, updated_at = now()
  from jsonb_to_recordset(p_adjustments) as x(carat text, adjustment_sar numeric)
  where a.carat = x.carat and a.adjustment_sar is distinct from x.adjustment_sar;
  select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into next_value from public.price_adjustments a;
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, before_value, after_value)
  values (p_actor, p_actor_role, 'price_adjustments_updated', 'price_adjustments', previous, next_value);
end;
$$;
revoke all on function public.apply_price_adjustments(uuid, public.app_role, jsonb) from public, anon, authenticated;
grant execute on function public.apply_price_adjustments(uuid, public.app_role, jsonb) to service_role;
