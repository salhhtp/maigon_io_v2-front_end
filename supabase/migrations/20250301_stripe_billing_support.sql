-- Stripe billing support: extend user_plans with Stripe metadata and
-- introduce billing transaction ledger for pay-as-you-go purchases.

do $body$
begin
  if to_regclass('public.user_plans') is not null then
    alter table public.user_plans
      add column if not exists stripe_customer_id text,
      add column if not exists stripe_subscription_id text,
      add column if not exists stripe_price_id text,
      add column if not exists stripe_product_id text,
      add column if not exists stripe_checkout_session_id text,
      add column if not exists stripe_payment_intent_id text,
      add column if not exists stripe_invoice_id text,
      add column if not exists billing_status text,
      add column if not exists current_period_start timestamptz,
      add column if not exists current_period_end timestamptz,
      add column if not exists cancel_at_period_end boolean,
      add column if not exists last_synced_at timestamptz;

    create index if not exists idx_user_plans_stripe_customer
      on public.user_plans(stripe_customer_id);

    create index if not exists idx_user_plans_stripe_subscription
      on public.user_plans(stripe_subscription_id);
  else
    raise notice 'Skipping user_plans Stripe metadata migration because table does not exist.';
  end if;
end;
$body$;

do $body$
begin
  if to_regclass('public.user_profiles') is not null then
    create table if not exists public.billing_transactions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references public.user_profiles(id) on delete cascade,
      organization_id uuid references public.organizations(id) on delete set null,
      plan_key text not null,
      stripe_payment_intent_id text,
      stripe_checkout_session_id text,
      stripe_invoice_id text,
      quantity integer not null default 1,
      amount_cents integer not null,
      currency text not null default 'eur',
      status text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_billing_tx_user on public.billing_transactions(user_id);
    create index if not exists idx_billing_tx_created on public.billing_transactions(created_at desc);

    alter table public.billing_transactions enable row level security;

    drop policy if exists "billing_transactions_service_role" on public.billing_transactions;
    create policy "billing_transactions_service_role" on public.billing_transactions
    for all using (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    )
    with check (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    );

    comment on table public.billing_transactions is
      'Ledger of Stripe checkout and payment events used to reconcile pay-as-you-go purchases and subscription updates.';
  else
    raise notice 'Skipping billing_transactions table because user_profiles table does not exist.';
  end if;
end;
$body$;
