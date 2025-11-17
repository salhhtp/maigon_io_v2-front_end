-- Backfill auth_user_id in user_profiles and ensure admin role
-- Idempotent and safe to re-run

do $body$
begin
  if to_regclass('public.user_profiles') is null then
    raise notice 'Skipping auth linkage backfill because user_profiles table does not exist.';
    return;
  end if;

  alter table if exists public.user_profiles
    add column if not exists email text;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'email'
  ) then
    -- Link user_profiles.auth_user_id to auth.users by email when missing
    update public.user_profiles p
    set auth_user_id = u.id,
        updated_at = now()
    from auth.users u
    where p.auth_user_id is null
      and p.email is not null
      and lower(p.email) = lower(u.email);

    -- Optional: ensure admin role for a known admin email
    -- Change email as appropriate for your environment
    update public.user_profiles
    set role = 'admin', updated_at = now()
    where email is not null
      and lower(email) = lower('admin@maigon.io');
  else
    raise notice 'Skipping email-based auth linkage because email column is missing on user_profiles.';
  end if;
end;
$body$;
