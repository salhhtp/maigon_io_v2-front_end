-- Run this SQL after creating Arunendu's account to confirm his email
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), 
    '{email_verified}', 
    'true'::jsonb
  )
WHERE email = 'arunendu.mazumder@maigon.io';

-- Verify the update worked
SELECT 
  email,
  email_confirmed_at,
  raw_user_meta_data->>'email_verified' as email_verified
FROM auth.users 
WHERE email = 'arunendu.mazumder@maigon.io';
