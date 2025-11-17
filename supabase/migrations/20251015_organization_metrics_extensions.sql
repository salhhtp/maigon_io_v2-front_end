-- Organization-aware metrics, interaction logging, and compliance approvals

-- 1. Extend existing tables with organization scoping
alter table if exists public.contracts
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table if exists public.contract_reviews
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table if exists public.contract_ingestions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table if exists public.user_activities
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table if exists public.user_usage_stats
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table if exists public.analysis_metrics
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_contracts_org on public.contracts(organization_id);
create index if not exists idx_contract_reviews_org on public.contract_reviews(organization_id);
create index if not exists idx_contract_ingestions_org on public.contract_ingestions(organization_id);
create index if not exists idx_user_activities_org on public.user_activities(organization_id);
create index if not exists idx_user_usage_stats_org on public.user_usage_stats(organization_id);
create index if not exists idx_analysis_metrics_org on public.analysis_metrics(organization_id);

-- 2. Backfill existing data with organization identifiers
update public.contracts c
set organization_id = p.organization_id
from public.user_profiles p
where c.organization_id is null
  and c.user_id = p.id;

update public.contract_reviews r
set organization_id = p.organization_id
from public.user_profiles p
where r.organization_id is null
  and r.user_id = p.id;

update public.contract_ingestions i
set organization_id = p.organization_id
from public.user_profiles p
where i.organization_id is null
  and i.user_id = p.id;

update public.user_activities a
set organization_id = p.organization_id
from public.user_profiles p
where a.organization_id is null
  and a.user_id = p.id;

update public.user_usage_stats s
set organization_id = p.organization_id
from public.user_profiles p
where s.organization_id is null
  and s.user_id = p.id;

update public.analysis_metrics m
set organization_id = p.organization_id
from public.user_profiles p
where m.organization_id is null
  and m.user_id = p.id;

-- 3. Helper function to assign organization from linked user
create or replace function public.set_org_id_from_user()
returns trigger as $$
declare
  target_org uuid;
begin
  if NEW.organization_id is not null then
    return NEW;
  end if;

  if NEW.user_id is null then
    return NEW;
  end if;

  select organization_id
    into target_org
  from public.user_profiles
  where id = NEW.user_id;

  NEW.organization_id := target_org;
  return NEW;
end;
$$ language plpgsql;

-- 4. Triggers to keep organization_id in sync
drop trigger if exists trg_contracts_set_org on public.contracts;
create trigger trg_contracts_set_org
  before insert or update on public.contracts
  for each row execute function public.set_org_id_from_user();

drop trigger if exists trg_contract_reviews_set_org on public.contract_reviews;
create trigger trg_contract_reviews_set_org
  before insert or update on public.contract_reviews
  for each row execute function public.set_org_id_from_user();

drop trigger if exists trg_contract_ingestions_set_org on public.contract_ingestions;
create trigger trg_contract_ingestions_set_org
  before insert or update on public.contract_ingestions
  for each row execute function public.set_org_id_from_user();

drop trigger if exists trg_user_activities_set_org on public.user_activities;
create trigger trg_user_activities_set_org
  before insert or update on public.user_activities
  for each row execute function public.set_org_id_from_user();

drop trigger if exists trg_user_usage_stats_set_org on public.user_usage_stats;
create trigger trg_user_usage_stats_set_org
  before insert or update on public.user_usage_stats
  for each row execute function public.set_org_id_from_user();

drop trigger if exists trg_analysis_metrics_set_org on public.analysis_metrics;
create trigger trg_analysis_metrics_set_org
  before insert or update on public.analysis_metrics
  for each row execute function public.set_org_id_from_user();

-- 5. Agent interaction logging with organization scope
create table if not exists public.agent_interaction_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  review_id uuid references public.contract_reviews(id) on delete set null,
  provider text,
  model text,
  edit_count integer,
  fallback_used boolean default false,
  latency_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.agent_interaction_logs enable row level security;

drop trigger if exists trg_agent_interactions_set_org on public.agent_interaction_logs;
create trigger trg_agent_interactions_set_org
  before insert or update on public.agent_interaction_logs
  for each row execute function public.set_org_id_from_user();

create index if not exists idx_agent_interactions_org on public.agent_interaction_logs(organization_id);
create index if not exists idx_agent_interactions_user on public.agent_interaction_logs(user_id);
create index if not exists idx_agent_interactions_contract on public.agent_interaction_logs(contract_id);

drop policy if exists "agent_interactions_select_scoped" on public.agent_interaction_logs;
create policy "agent_interactions_select_scoped"
  on public.agent_interaction_logs
  for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.user_profiles viewer
      where viewer.auth_user_id = auth.uid()
        and (
          viewer.role = 'admin'
          or viewer.id = agent_interaction_logs.user_id
          or (
            viewer.organization_role = 'org_admin'
            and viewer.organization_id = agent_interaction_logs.organization_id
          )
        )
    )
  );

drop policy if exists "agent_interactions_insert_self" on public.agent_interaction_logs;
create policy "agent_interactions_insert_self"
  on public.agent_interaction_logs
  for insert
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.user_profiles viewer
      where viewer.auth_user_id = auth.uid()
        and viewer.id = agent_interaction_logs.user_id
    )
  );

-- 6. Agent edit approvals with organization scope
create table if not exists public.agent_edit_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  interaction_id uuid references public.agent_interaction_logs(id) on delete set null,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  review_id uuid references public.contract_reviews(id) on delete set null,
  proposed_edit_id text,
  clause_reference text,
  change_type text,
  suggested_text text,
  rationale text,
  metadata jsonb not null default '{}'::jsonb,
  accepted_at timestamptz not null default now()
);

alter table public.agent_edit_approvals enable row level security;

drop trigger if exists trg_agent_edit_approvals_set_org on public.agent_edit_approvals;
create trigger trg_agent_edit_approvals_set_org
  before insert or update on public.agent_edit_approvals
  for each row execute function public.set_org_id_from_user();

create index if not exists idx_agent_edit_approvals_org on public.agent_edit_approvals(organization_id);
create index if not exists idx_agent_edit_approvals_user on public.agent_edit_approvals(user_id);
create index if not exists idx_agent_edit_approvals_contract on public.agent_edit_approvals(contract_id);

drop policy if exists "agent_edit_approvals_select_scoped" on public.agent_edit_approvals;
create policy "agent_edit_approvals_select_scoped"
  on public.agent_edit_approvals
  for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.user_profiles viewer
      where viewer.auth_user_id = auth.uid()
        and (
          viewer.role = 'admin'
          or viewer.id = agent_edit_approvals.user_id
          or (
            viewer.organization_role = 'org_admin'
            and viewer.organization_id = agent_edit_approvals.organization_id
          )
        )
    )
  );

drop policy if exists "agent_edit_approvals_insert_self" on public.agent_edit_approvals;
create policy "agent_edit_approvals_insert_self"
  on public.agent_edit_approvals
  for insert
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.user_profiles viewer
      where viewer.auth_user_id = auth.uid()
        and viewer.id = agent_edit_approvals.user_id
    )
  );
