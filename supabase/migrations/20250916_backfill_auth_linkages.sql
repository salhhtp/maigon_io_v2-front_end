-- Backfill auth_user_id in user_profiles and ensure admin role
-- Idempotent and safe to re-run

-- Link user_profiles.auth_user_id to auth.users by email when missing
update public.user_profiles p
set auth_user_id = u.id,
    updated_at = now()
from auth.users u
where p.auth_user_id is null
  and lower(p.email) = lower(u.email);

-- Optional: ensure admin role for a known admin email
-- Change email as appropriate for your environment
update public.user_profiles
set role = 'admin', updated_at = now()
where lower(email) = lower('admin@maigon.io');

