-- Ensure user-scoped tables consistently reference user_profiles(id)
-- and cascade deletions when a profile is removed.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'contracts_user_id_fkey'
  ) then
    alter table public.contracts
      drop constraint contracts_user_id_fkey;
  end if;

  alter table public.contracts
    add constraint contracts_user_id_fkey
    foreign key (user_id)
    references public.user_profiles(id)
    on delete cascade;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'user_activities_user_id_fkey'
  ) then
    alter table public.user_activities
      drop constraint user_activities_user_id_fkey;
  end if;

  alter table public.user_activities
    add constraint user_activities_user_id_fkey
    foreign key (user_id)
    references public.user_profiles(id)
    on delete cascade;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'user_usage_stats_user_id_fkey'
  ) then
    alter table public.user_usage_stats
      drop constraint user_usage_stats_user_id_fkey;
  end if;

  alter table public.user_usage_stats
    add constraint user_usage_stats_user_id_fkey
    foreign key (user_id)
    references public.user_profiles(id)
    on delete cascade;
end
$$;
