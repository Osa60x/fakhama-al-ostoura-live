-- سبائك الفخامة: المالك الوحيد المعتمد هو البريد المحدد من المستخدم.
-- لا تمنح أي حسابات قديمة صلاحيات إدارية بعد هذا الترحيل.

create or replace function private.assign_sabaaek_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = 'osa60x@gmail.com' then
    update public.profiles
      set role = 'owner', is_active = true, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_assign_sabaaek_owner on auth.users;
create trigger zz_assign_sabaaek_owner
  after insert on auth.users
  for each row execute procedure private.assign_sabaaek_owner();

-- إيقاف كل حساب إداري سابق حتى يصبح المالك المحدد هو مصدر الدعوات الجديد.
update public.profiles
  set role = 'user', is_active = false, updated_at = now()
where role in ('owner', 'manager');

update public.manager_invites
  set is_active = false, updated_at = now()
where is_active = true;

-- إذا كان حساب المالك موجودًا بالفعل، فعّله فورًا؛ وإذا لم يوجد فسيُفعّل عند أول دخول برابط البريد.
update public.profiles p
  set role = 'owner', is_active = true, updated_at = now()
from auth.users u
where p.id = u.id
  and lower(coalesce(u.email, '')) = 'osa60x@gmail.com';
