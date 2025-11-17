-- Core schema and RLS policies required by the app
-- Idempotent: safe to re-run

-- 0) Prereqs
create extension if not exists pgcrypto;

-- 1) Generic updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2) user_profiles columns used by app (link to auth.users)
do $user_profiles$
begin
  if to_regclass('public.user_profiles') is null then
    create table public.user_profiles (
      id uuid primary key default gen_random_uuid(),
      auth_user_id uuid unique,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      role text check (role in ('user','admin')) default 'user',
      is_active boolean default true
    );
  else
    alter table if exists public.user_profiles
      add column if not exists auth_user_id uuid unique,
      add column if not exists created_at timestamptz default now(),
      add column if not exists updated_at timestamptz default now(),
      add column if not exists role text check (role in ('user','admin')) default 'user',
      add column if not exists is_active boolean default true;
  end if;

  if to_regclass('public.user_profiles') is not null then
    if not exists (select 1 from pg_constraint where conname = 'user_profiles_auth_user_id_fkey') then
      alter table public.user_profiles
        add constraint user_profiles_auth_user_id_fkey
        foreign key (auth_user_id) references auth.users(id) on delete cascade;
    end if;
    drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
    create trigger trg_user_profiles_updated_at
      before update on public.user_profiles
      for each row execute function public.update_updated_at_column();
  end if;
end;
$user_profiles$;

-- 3) contracts
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  content text,
  file_name text,
  file_size integer,
  status text not null default 'pending' check (status in ('pending','reviewing','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  custom_solution_id uuid null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contracts_user_id_fkey') then
    alter table public.contracts
      add constraint contracts_user_id_fkey
      foreign key (user_id) references public.user_profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contracts_custom_solution_id_fkey') then
    alter table public.contracts
      add constraint contracts_custom_solution_id_fkey
      foreign key (custom_solution_id) references public.custom_solutions(id);
  end if;
end $$;

create index if not exists idx_contracts_user_id_created_at on public.contracts(user_id, created_at desc);

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.update_updated_at_column();

alter table public.contracts enable row level security;

drop policy if exists "contracts_select_own" on public.contracts;
create policy "contracts_select_own" on public.contracts
for select using (
  exists (
    select 1 from public.user_profiles p
    where p.id = contracts.user_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "contracts_insert_own" on public.contracts;
create policy "contracts_insert_own" on public.contracts
for insert with check (
  exists (
    select 1 from public.user_profiles p
    where p.id = user_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "contracts_update_own" on public.contracts;
create policy "contracts_update_own" on public.contracts
for update using (
  exists (
    select 1 from public.user_profiles p
    where p.id = contracts.user_id and p.auth_user_id = auth.uid()
  )
) with check (true);

-- 4) contract_reviews
create table if not exists public.contract_reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null,
  user_id uuid not null,
  review_type text not null,
  results jsonb not null default '{}'::jsonb,
  score integer,
  confidence_level numeric,
  model_used text,
  custom_solution_id uuid,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contract_reviews_contract_id_fkey') then
    alter table public.contract_reviews
      add constraint contract_reviews_contract_id_fkey
      foreign key (contract_id) references public.contracts(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contract_reviews_user_id_fkey') then
    alter table public.contract_reviews
      add constraint contract_reviews_user_id_fkey
      foreign key (user_id) references public.user_profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contract_reviews_custom_solution_id_fkey') then
    alter table public.contract_reviews
      add constraint contract_reviews_custom_solution_id_fkey
      foreign key (custom_solution_id) references public.custom_solutions(id);
  end if;
end $$;

create index if not exists idx_contract_reviews_user_created on public.contract_reviews(user_id, created_at desc);
create index if not exists idx_contract_reviews_contract on public.contract_reviews(contract_id);

alter table public.contract_reviews enable row level security;

drop policy if exists "reviews_select_own" on public.contract_reviews;
create policy "reviews_select_own" on public.contract_reviews
for select using (
  exists (
    select 1 from public.contracts c
    join public.user_profiles p on p.id = c.user_id
    where c.id = contract_reviews.contract_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "reviews_insert_own" on public.contract_reviews;
create policy "reviews_insert_own" on public.contract_reviews
for insert with check (
  exists (
    select 1 from public.contracts c
    join public.user_profiles p on p.id = c.user_id
    where c.id = contract_id and p.auth_user_id = auth.uid()
  )
);

-- 5) user_activities
create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  activity_type text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_activities_user_id_fkey') then
    alter table public.user_activities
      add constraint user_activities_user_id_fkey
      foreign key (user_id) references public.user_profiles(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_user_activities_user_created on public.user_activities(user_id, created_at desc);

alter table public.user_activities enable row level security;

drop policy if exists "activities_select_own" on public.user_activities;
create policy "activities_select_own" on public.user_activities
for select using (
  exists (
    select 1 from public.user_profiles p
    where p.id = user_activities.user_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "activities_insert_own" on public.user_activities;
create policy "activities_insert_own" on public.user_activities
for insert with check (
  exists (
    select 1 from public.user_profiles p
    where p.id = user_id and p.auth_user_id = auth.uid()
  )
);

-- 6) user_usage_stats
create table if not exists public.user_usage_stats (
  user_id uuid primary key,
  contracts_reviewed integer not null default 0,
  total_pages_reviewed integer not null default 0,
  risk_assessments_completed integer not null default 0,
  compliance_checks_completed integer not null default 0,
  last_activity timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_usage_stats_user_id_fkey') then
    alter table public.user_usage_stats
      add constraint user_usage_stats_user_id_fkey
      foreign key (user_id) references public.user_profiles(id) on delete cascade;
  end if;
end $$;

drop trigger if exists trg_user_usage_stats_updated_at on public.user_usage_stats;
create trigger trg_user_usage_stats_updated_at
  before update on public.user_usage_stats
  for each row execute function public.update_updated_at_column();

alter table public.user_usage_stats enable row level security;

drop policy if exists "usage_select_own" on public.user_usage_stats;
create policy "usage_select_own" on public.user_usage_stats
for select using (
  exists (
    select 1 from public.user_profiles p
    where p.id = user_usage_stats.user_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "usage_insert_own" on public.user_usage_stats;
create policy "usage_insert_own" on public.user_usage_stats
for insert with check (
  exists (
    select 1 from public.user_profiles p
    where p.id = user_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "usage_update_own" on public.user_usage_stats;
create policy "usage_update_own" on public.user_usage_stats
for update using (
  exists (
    select 1 from public.user_profiles p
    where p.id = user_usage_stats.user_id and p.auth_user_id = auth.uid()
  )
) with check (true);

-- 7) admin_analytics (admin-only select)
do $admin_analytics$
begin
  if to_regclass('public.admin_analytics') is not null then
    alter table if exists public.admin_analytics enable row level security;

    drop policy if exists "admin_analytics_select_admins" on public.admin_analytics;
    create policy "admin_analytics_select_admins" on public.admin_analytics
    for select using (
      exists (
        select 1 from public.user_profiles p
        where p.auth_user_id = auth.uid() and p.role = 'admin'
      )
    );
  else
    raise notice 'Skipping admin_analytics policies because table is missing.';
  end if;
end;
$admin_analytics$;
