-- Organization alert preferences and digest scaffolding

create table if not exists public.organization_alert_preferences (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  notify_high_risk boolean not null default true,
  notify_pending_edits boolean not null default false,
  alert_channel text not null default 'email',
  metadata jsonb not null default '{}'::jsonb,
  last_digest_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_alert_prefs_channel
  on public.organization_alert_preferences(alert_channel);

-- keep updated_at fresh
create trigger trg_org_alert_prefs_updated
  before update on public.organization_alert_preferences
  for each row execute function public.update_updated_at_column();

alter table public.organization_alert_preferences enable row level security;

drop policy if exists "org_alert_prefs_select_scoped" on public.organization_alert_preferences;
create policy "org_alert_prefs_select_scoped" on public.organization_alert_preferences
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id = organization_alert_preferences.organization_id
        )
      )
  )
);

drop policy if exists "org_alert_prefs_upsert" on public.organization_alert_preferences;
create policy "org_alert_prefs_upsert" on public.organization_alert_preferences
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id = organization_alert_preferences.organization_id
        )
      )
  )
);

create policy "org_alert_prefs_update" on public.organization_alert_preferences
for update using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id = organization_alert_preferences.organization_id
        )
      )
  )
);

-- ensure every organization has a preference row
insert into public.organization_alert_preferences (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;
