-- فهارس تغطي المفاتيح الخارجية التي تظهر في مسارات الإدارة والنسخ الاحتياطي.
-- تستخدم IF NOT EXISTS لتبقى آمنة عند إعادة فحص بيئة مماثلة.

create index if not exists backup_exports_created_by_idx on public.backup_exports (created_by);
create index if not exists contact_links_updated_by_idx on public.contact_links (updated_by);
create index if not exists manager_invites_claimed_by_idx on public.manager_invites (claimed_by);
create index if not exists manager_invites_invited_by_idx on public.manager_invites (invited_by);
create index if not exists price_adjustments_updated_by_idx on public.price_adjustments (updated_by);
create index if not exists site_settings_updated_by_idx on public.site_settings (updated_by);
