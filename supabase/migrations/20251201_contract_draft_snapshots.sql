create table if not exists public.contract_draft_snapshots (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  draft_key text not null,
  html text,
  plain_text text,
  summary text,
  applied_changes jsonb not null default '[]'::jsonb,
  asset_bucket text,
  asset_path text,
  provider text,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_contract_draft_snapshots_key
  on public.contract_draft_snapshots(contract_id, draft_key);

create index if not exists idx_contract_draft_snapshots_contract
  on public.contract_draft_snapshots(contract_id);

drop trigger if exists trg_contract_draft_snapshots_updated_at on public.contract_draft_snapshots;
create trigger trg_contract_draft_snapshots_updated_at
  before update on public.contract_draft_snapshots
  for each row execute function public.set_current_timestamp_updated_at();

alter table public.contract_draft_snapshots enable row level security;

drop policy if exists "contract_draft_snapshots_service_role_only" on public.contract_draft_snapshots;
create policy "contract_draft_snapshots_service_role_only"
  on public.contract_draft_snapshots
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
