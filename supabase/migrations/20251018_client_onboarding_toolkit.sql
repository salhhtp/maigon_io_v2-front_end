-- Client onboarding toolkit tables for invite management

create table if not exists public.org_invite_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  plan_key text not null,
  plan_quota jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  expires_at timestamptz,
  used_at timestamptz,
  created_by_auth_user uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invite_links_token on public.org_invite_links(token);
create index if not exists idx_org_invite_links_status on public.org_invite_links(status);
create index if not exists idx_org_invite_links_org on public.org_invite_links(organization_id);

create table if not exists public.org_member_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_by_profile uuid references public.user_profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  organization_role text default 'member' check (organization_role in ('member','org_admin')),
  expires_at timestamptz,
  used_at timestamptz,
  accepted_user_id uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_member_invites_token on public.org_member_invites(token);
create index if not exists idx_org_member_invites_org on public.org_member_invites(organization_id);
create index if not exists idx_org_member_invites_status on public.org_member_invites(status);

-- enable RLS
alter table public.org_invite_links enable row level security;
alter table public.org_member_invites enable row level security;

-- policies for org_invite_links (Maigon admins only)
drop policy if exists "org_invite_links_select" on public.org_invite_links;
create policy "org_invite_links_select" on public.org_invite_links
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and viewer.role = 'admin'
  )
);

drop policy if exists "org_invite_links_insert" on public.org_invite_links;
create policy "org_invite_links_insert" on public.org_invite_links
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and viewer.role = 'admin'
  )
);

drop policy if exists "org_invite_links_update" on public.org_invite_links;
create policy "org_invite_links_update" on public.org_invite_links
for update using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and viewer.role = 'admin'
  )
);

-- policies for org_member_invites (Maigon admins and org admins)
drop policy if exists "org_member_invites_select" on public.org_member_invites;
create policy "org_member_invites_select" on public.org_member_invites
for select using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id = org_member_invites.organization_id
        )
      )
  )
);

drop policy if exists "org_member_invites_insert" on public.org_member_invites;
create policy "org_member_invites_insert" on public.org_member_invites
for insert with check (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id = org_member_invites.organization_id
        )
      )
  )
);

drop policy if exists "org_member_invites_update" on public.org_member_invites;
create policy "org_member_invites_update" on public.org_member_invites
for update using (
  exists (
    select 1
    from public.user_profiles viewer
    where viewer.auth_user_id = auth.uid()
      and (
        viewer.role = 'admin'
        or (
          viewer.organization_role = 'org_admin'
          and viewer.organization_id = org_member_invites.organization_id
        )
      )
  )
);

-- allow service role direct inserts/updates
grant insert, update on public.org_invite_links to service_role;
grant insert, update on public.org_member_invites to service_role;
