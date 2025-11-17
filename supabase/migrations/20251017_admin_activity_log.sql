-- Admin activity log for user/org provisioning actions

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references public.user_profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_activity_log_admin on public.admin_activity_log(admin_auth_user_id);
create index if not exists idx_admin_activity_log_user on public.admin_activity_log(target_user_id);

alter table public.admin_activity_log enable row level security;

drop policy if exists "admin_activity_select" on public.admin_activity_log;
create policy "admin_activity_select" on public.admin_activity_log
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and viewer.role = 'admin'
  )
);

drop policy if exists "admin_activity_insert" on public.admin_activity_log;
create policy "admin_activity_insert" on public.admin_activity_log
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and viewer.role = 'admin'
  )
);

-- service role can insert without auth.uid(), so grant direct insert to service role
grant insert on public.admin_activity_log to service_role;

alter table if exists public.user_plans
  add column if not exists documents_limit integer,
  add column if not exists seats_limit integer;
