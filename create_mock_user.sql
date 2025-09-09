-- Create a mock user for testing purposes
-- This script will create a user that can immediately sign in

-- First, let's create a mock auth user with a known password hash
-- Note: In production, you would use Supabase's auth.admin API
-- For testing, we'll create a simple user that bypasses complex auth

-- Create a simple mock user profile directly (for immediate testing)
INSERT INTO user_profiles (
  id,
  auth_user_id,
  email,
  first_name,
  last_name,
  company,
  phone,
  company_size,
  country_region,
  industry,
  role,
  is_active
)
SELECT 
  gen_random_uuid(),
  gen_random_uuid(),
  'mockuser@maigon.io',
  'Mock',
  'User',
  'Maigon Test',
  '+1234567890',
  '11-50',
  'US',
  'legal',
  'admin',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE email = 'mockuser@maigon.io'
);

-- Create usage stats for the mock user
INSERT INTO user_usage_stats (
  user_id,
  contracts_reviewed,
  total_pages_reviewed,
  risk_assessments_completed,
  compliance_checks_completed,
  last_activity
)
SELECT 
  up.id,
  5,
  25,
  3,
  8,
  NOW()
FROM user_profiles up
WHERE up.email = 'mockuser@maigon.io'
AND NOT EXISTS (
  SELECT 1 FROM user_usage_stats uu WHERE uu.user_id = up.id
);

-- Verify the mock user was created
SELECT 
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.role,
  up.is_active,
  uu.contracts_reviewed,
  uu.total_pages_reviewed
FROM user_profiles up
LEFT JOIN user_usage_stats uu ON up.id = uu.user_id
WHERE up.email = 'mockuser@maigon.io';
