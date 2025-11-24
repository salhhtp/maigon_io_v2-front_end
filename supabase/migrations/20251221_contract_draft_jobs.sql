create table if not exists public.contract_draft_jobs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  draft_key text,
  status text not null check (status in ('pending', 'running', 'succeeded', 'failed')),
  error text,
  result_snapshot_id uuid references public.contract_draft_snapshots(id) on delete set null,
  result jsonb,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_contract_draft_jobs_contract
  on public.contract_draft_jobs(contract_id);

drop trigger if exists trg_contract_draft_jobs_updated_at on public.contract_draft_jobs;
create trigger trg_contract_draft_jobs_updated_at
  before update on public.contract_draft_jobs
  for each row execute function public.set_current_timestamp_updated_at();

alter table public.contract_draft_jobs enable row level security;

drop policy if exists "contract_draft_jobs_service_role_only" on public.contract_draft_jobs;
create policy "contract_draft_jobs_service_role_only"
  on public.contract_draft_jobs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
