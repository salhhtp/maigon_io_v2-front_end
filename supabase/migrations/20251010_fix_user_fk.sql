-- Align foreign keys with user_profiles table
alter table if exists public.contracts
  drop constraint if exists contracts_user_id_fkey;
alter table if exists public.contracts
  add constraint contracts_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

alter table if exists public.user_activities
  drop constraint if exists user_activities_user_id_fkey;
alter table if exists public.user_activities
  add constraint user_activities_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

alter table if exists public.user_usage_stats
  drop constraint if exists user_usage_stats_user_id_fkey;
alter table if exists public.user_usage_stats
  add constraint user_usage_stats_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;
