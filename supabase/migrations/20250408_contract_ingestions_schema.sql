-- Contract ingestion storage schema
create table if not exists public.contract_ingestions (
  id uuid primary key,
  user_id uuid,
  status text not null default 'uploaded',
  storage_bucket text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  file_size bigint,
  strategy text,
  word_count integer,
  character_count integer,
  page_count integer,
  warnings jsonb not null default '[]'::jsonb,
  needs_ocr boolean not null default false,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  extracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_ingestion_assets (
  id uuid primary key default gen_random_uuid(),
  ingestion_id uuid not null references public.contract_ingestions(id) on delete cascade,
  asset_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contract_ingestions_set_updated_at
before update on public.contract_ingestions
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.contract_ingestions enable row level security;
alter table public.contract_ingestion_assets enable row level security;

create policy "Service role full access contract_ingestions"
  on public.contract_ingestions
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access contract_ingestion_assets"
  on public.contract_ingestion_assets
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Users can view own ingestions"
  on public.contract_ingestions
  for select
  using (
    auth.role() = 'service_role'
    or (user_id is not null and auth.uid() = user_id)
  );

create policy "Users can view own ingestion assets"
  on public.contract_ingestion_assets
  for select
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.contract_ingestions ci
      where ci.id = contract_ingestion_assets.ingestion_id
        and ci.user_id is not null
        and auth.uid() = ci.user_id
    )
  );

create index if not exists contract_ingestions_user_idx
  on public.contract_ingestions(user_id);

create index if not exists contract_ingestions_status_idx
  on public.contract_ingestions(status);

create index if not exists contract_ingestion_assets_ingestion_idx
  on public.contract_ingestion_assets(ingestion_id);
