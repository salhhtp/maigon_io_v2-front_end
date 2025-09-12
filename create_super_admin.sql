-- Create Super Admin Account for testing
-- This will create a user in Supabase auth and user_profiles table

-- First create auth user (this would typically be done through Supabase auth API)
-- We'll create the user profile assuming the auth user exists

-- Create or update admin user profile
INSERT INTO user_profiles (
  id,
  email,
  first_name,
  last_name,
  company,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@maigon.io',
  'Super',
  'Admin',
  'Maigon',
  'admin',
  true,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = now();

-- Create user plan for admin
INSERT INTO user_plans (
  user_id,
  plan_type,
  plan_name,
  price,
  contracts_limit,
  contracts_used,
  billing_cycle,
  features,
  created_at,
  updated_at
) SELECT 
  (SELECT auth_user_id FROM user_profiles WHERE email = 'admin@maigon.io'),
  'professional',
  'Professional Plan',
  0,
  999999,
  0,
  'monthly',
  '["unlimited_reviews", "custom_solutions", "admin_access", "advanced_analytics"]'::jsonb,
  now(),
  now()
ON CONFLICT (user_id) DO UPDATE SET
  plan_type = 'professional',
  contracts_limit = 999999,
  features = '["unlimited_reviews", "custom_solutions", "admin_access", "advanced_analytics"]'::jsonb,
  updated_at = now();

-- Create usage stats for admin
INSERT INTO user_usage_stats (
  user_id,
  contracts_reviewed,
  total_pages_reviewed,
  risk_assessments_completed,
  compliance_checks_completed,
  created_at,
  updated_at
) SELECT 
  id,
  0,
  0,
  0,
  0,
  now(),
  now()
FROM user_profiles 
WHERE email = 'admin@maigon.io'
ON CONFLICT (user_id) DO NOTHING;
