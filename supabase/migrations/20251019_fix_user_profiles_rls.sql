-- Helper functions to avoid recursive RLS checks on user_profiles
create or replace function public.is_maigon_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.auth_user_id = uid
      and p.role = 'admin'
  );
$$;

create or replace function public.is_org_admin_for(uid uuid, org uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.auth_user_id = uid
      and p.organization_id = org
      and coalesce(p.organization_role, 'member') = 'org_admin'
  );
$$;

grant execute on function public.is_maigon_admin(uuid) to authenticated;
grant execute on function public.is_org_admin_for(uuid, uuid) to authenticated;

-- Replace recursive policies
drop policy if exists "user_profiles_select_scoped" on public.user_profiles;
create policy "user_profiles_select_scoped" on public.user_profiles
for select using (
  auth.uid() = user_profiles.auth_user_id
  or public.is_maigon_admin(auth.uid())
  or (
    user_profiles.organization_id is not null
    and public.is_org_admin_for(auth.uid(), user_profiles.organization_id)
  )
);

drop policy if exists "user_profiles_update_admin" on public.user_profiles;
create policy "user_profiles_update_admin" on public.user_profiles
for update using (
  public.is_maigon_admin(auth.uid())
)
with check (true);
