-- Organizations support and org-admin scoped access

-- Create organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  billing_plan text not null default 'standard',
  seats_limit integer not null default 10,
  documents_limit integer not null default 1000,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_slug on public.organizations(slug);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.update_updated_at_column();

alter table public.organizations enable row level security;

-- Extend user profiles with organization metadata
alter table public.user_profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists organization_role text check (organization_role in ('member','org_admin')) default 'member';

create index if not exists idx_user_profiles_org on public.user_profiles(organization_id);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_scoped" on public.user_profiles;
create policy "user_profiles_select_scoped" on public.user_profiles
for select using (
  auth.uid() = user_profiles.auth_user_id
  or exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id is not null
          and viewer.organization_id = user_profiles.organization_id
        )
      )
  )
);

drop policy if exists "user_profiles_insert_self" on public.user_profiles;
create policy "user_profiles_insert_self" on public.user_profiles
for insert with check (auth.uid() = auth_user_id);

drop policy if exists "user_profiles_update_self" on public.user_profiles;
create policy "user_profiles_update_self" on public.user_profiles
for update using (auth.uid() = user_profiles.auth_user_id)
with check (auth.uid() = user_profiles.auth_user_id);

drop policy if exists "user_profiles_update_admin" on public.user_profiles;
create policy "user_profiles_update_admin" on public.user_profiles
for update using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and viewer.role = 'admin'
  )
)
with check (true);

drop policy if exists "organizations_select_scoped" on public.organizations;
create policy "organizations_select_scoped" on public.organizations
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_id = organizations.id
          and coalesce(viewer.organization_role, 'member') in ('member', 'org_admin')
        )
      )
  )
);

-- Re-scope contracts policies
drop policy if exists "contracts_select_own" on public.contracts;
drop policy if exists "contracts_insert_own" on public.contracts;
drop policy if exists "contracts_update_own" on public.contracts;

create policy "contracts_select_scoped" on public.contracts
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = contracts.user_id
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id is not null
          and viewer.organization_id = (
            select owner.organization_id
            from public.user_profiles owner
            where owner.id = contracts.user_id
          )
        )
      )
  )
);

create policy "contracts_insert_scoped" on public.contracts
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = contracts.user_id
      )
  )
);

create policy "contracts_update_scoped" on public.contracts
for update using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = contracts.user_id
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id is not null
          and viewer.organization_id = (
            select owner.organization_id
            from public.user_profiles owner
            where owner.id = contracts.user_id
          )
        )
      )
  )
) with check (true);

-- Re-scope contract review policies
drop policy if exists "reviews_select_own" on public.contract_reviews;
drop policy if exists "reviews_insert_own" on public.contract_reviews;

create policy "reviews_select_scoped" on public.contract_reviews
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = contract_reviews.user_id
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id is not null
          and viewer.organization_id = (
            select owner.organization_id
            from public.user_profiles owner
            join public.contracts c on c.id = contract_reviews.contract_id
            where owner.id = c.user_id
          )
        )
      )
  )
);

create policy "reviews_insert_scoped" on public.contract_reviews
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    join public.contracts c on c.id = contract_reviews.contract_id
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = c.user_id
      )
  )
);

-- Re-scope user activities policies
drop policy if exists "activities_select_own" on public.user_activities;
drop policy if exists "user_activities_select_own" on public.user_activities;
create policy "user_activities_select_scoped" on public.user_activities
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = user_activities.user_id
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id is not null
          and viewer.organization_id = (
            select member.organization_id
            from public.user_profiles member
            where member.id = user_activities.user_id
          )
        )
      )
  )
);

-- Re-scope usage stats policies
drop policy if exists "usage_select_own" on public.user_usage_stats;
drop policy if exists "usage_update_own" on public.user_usage_stats;
drop policy if exists "usage_insert_own" on public.user_usage_stats;
drop policy if exists "user_usage_stats_select_own" on public.user_usage_stats;
drop policy if exists "user_usage_stats_update_own" on public.user_usage_stats;
drop policy if exists "user_usage_stats_insert_own" on public.user_usage_stats;

create policy "user_usage_stats_select_scoped" on public.user_usage_stats
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = user_usage_stats.user_id
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id is not null
          and viewer.organization_id = (
            select member.organization_id
            from public.user_profiles member
            where member.id = user_usage_stats.user_id
          )
        )
      )
  )
);

create policy "user_usage_stats_insert_scoped" on public.user_usage_stats
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = user_usage_stats.user_id
      )
  )
);

create policy "user_usage_stats_update_scoped" on public.user_usage_stats
for update using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = user_usage_stats.user_id
      )
  )
) with check (true);

-- Analysis metrics policies with organization scope
drop policy if exists "analysis_metrics_select_own" on public.analysis_metrics;
drop policy if exists "analysis_metrics_insert_own" on public.analysis_metrics;
drop policy if exists "analysis_metrics_select_admins" on public.analysis_metrics;

create policy "analysis_metrics_select_scoped" on public.analysis_metrics
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = analysis_metrics.user_id
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id is not null
          and viewer.organization_id = (
            select member.organization_id
            from public.user_profiles member
            where member.id = analysis_metrics.user_id
          )
        )
      )
  )
);

create policy "analysis_metrics_insert_scoped" on public.analysis_metrics
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or viewer.id = analysis_metrics.user_id
      )
  )
);
