-- Observability metrics for AI analysis pipeline
create table if not exists public.analysis_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  contract_id uuid,
  review_id uuid,
  ingestion_id uuid,
  model_used text,
  review_type text,
  contract_type text,
  solution_key text,
  fallback_used boolean not null default false,
  retry_count integer not null default 0,
  latency_ms integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'completed',
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analysis_metrics enable row level security;

drop policy if exists "analysis_metrics_select_own" on public.analysis_metrics;
create policy "analysis_metrics_select_own" on public.analysis_metrics
for select using (
  exists (
    select 1 from public.user_profiles p
    where p.id = analysis_metrics.user_id
      and p.auth_user_id = auth.uid()
  )
);

-- allow users to insert their own metrics
drop policy if exists "analysis_metrics_insert_own" on public.analysis_metrics;
create policy "analysis_metrics_insert_own" on public.analysis_metrics
for insert with check (
  exists (
    select 1 from public.user_profiles p
    where p.id = user_id
      and p.auth_user_id = auth.uid()
  )
);

-- Admins can view all metrics
drop policy if exists "analysis_metrics_select_admins" on public.analysis_metrics;
create policy "analysis_metrics_select_admins" on public.analysis_metrics
for select using (
  exists (
    select 1 from public.user_profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  )
);

-- Ensure completed_at defaults when status is completed
create or replace function public.set_analysis_metric_completed_at()
returns trigger as $$
begin
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_analysis_metrics_completed_at on public.analysis_metrics;
create trigger trg_analysis_metrics_completed_at
before insert or update on public.analysis_metrics
for each row execute function public.set_analysis_metric_completed_at();
