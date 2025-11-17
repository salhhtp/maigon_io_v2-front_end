-- Pay-as-you-go credit balances and ledger

create table if not exists public.user_payg_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  credits_balance integer not null default 0,
  credits_purchased integer not null default 0,
  credits_consumed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_payg_balances_user_unique unique(user_id)
);

create table if not exists public.user_payg_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_user_payg_balances_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_payg_balances_set_updated_at
before update on public.user_payg_balances
for each row
execute function public.set_user_payg_balances_updated_at();

create index if not exists user_payg_balances_user_idx
  on public.user_payg_balances(user_id);

create index if not exists user_payg_ledger_user_idx
  on public.user_payg_ledger(user_id);

alter table public.user_payg_balances enable row level security;
alter table public.user_payg_ledger enable row level security;

create policy "Service role full access payg balances"
  on public.user_payg_balances
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role full access payg ledger"
  on public.user_payg_ledger
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Users can view their own payg balance"
  on public.user_payg_balances
  for select
  using (
    auth.role() = 'service_role'
    or (user_id is not null and auth.uid() = user_id)
  );

create policy "Users can view their own payg ledger"
  on public.user_payg_ledger
  for select
  using (
    auth.role() = 'service_role'
    or (user_id is not null and auth.uid() = user_id)
  );
