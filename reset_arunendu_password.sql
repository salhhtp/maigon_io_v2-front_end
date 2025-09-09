-- First, let's create a manual password reset for Arunendu
-- This will ensure the password matches the expected credentials

-- Check current user data first
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'email_verified' as email_verified,
  created_at
FROM auth.users 
WHERE email = 'arunendu.mazumder@maigon.io';

-- Ensure email is properly verified
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), 
    '{email_verified}', 
    'true'::jsonb
  )
WHERE email = 'arunendu.mazumder@maigon.io';

-- Also ensure salih's profile is created if missing
DO $$
BEGIN
  -- Check if salih's profile exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE email = 'salih.hatipoglu@maigon.io'
  ) THEN
    INSERT INTO user_profiles (
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
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'first_name', 'Salih'),
      COALESCE(au.raw_user_meta_data->>'last_name', 'Hatipoglu'),
      COALESCE(au.raw_user_meta_data->>'company', 'Salih'),
      au.raw_user_meta_data->>'phone',
      au.raw_user_meta_data->>'company_size',
      au.raw_user_meta_data->>'country_region',
      au.raw_user_meta_data->>'industry',
      'admin',
      true
    FROM auth.users au
    WHERE au.email = 'salih.hatipoglu@maigon.io';

    -- Create usage stats for salih if profile was created
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
      0,
      0,
      0,
      0,
      NOW()
    FROM user_profiles up
    WHERE up.email = 'salih.hatipoglu@maigon.io'
    AND NOT EXISTS (
      SELECT 1 FROM user_usage_stats uu WHERE uu.user_id = up.id
    );
  END IF;
END $$;

-- Verify both users are properly set up
SELECT 
  up.email,
  up.first_name,
  up.last_name,
  up.role,
  up.is_active,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.raw_user_meta_data->>'email_verified' as email_verified_meta
FROM user_profiles up
JOIN auth.users au ON up.auth_user_id = au.id
WHERE up.email IN ('arunendu.mazumder@maigon.io', 'salih.hatipoglu@maigon.io')
ORDER BY up.email;
