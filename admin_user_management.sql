-- ============================================================================
-- MAIGON USER MANAGEMENT SQL SCRIPTS
-- ============================================================================
-- Use these queries in your Supabase SQL Editor for user management

-- ----------------------------------------------------------------------------
-- 1. VIEW ALL USERS
-- ----------------------------------------------------------------------------
SELECT 
    email, 
    first_name, 
    last_name, 
    company,
    role, 
    is_active, 
    created_at,
    updated_at
FROM user_profiles 
ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- 2. PROMOTE USER TO ADMIN
-- ----------------------------------------------------------------------------
-- Replace 'user@example.com' with actual email
UPDATE user_profiles 
SET 
    role = 'admin',
    updated_at = now() 
WHERE email = 'user@example.com';

-- ----------------------------------------------------------------------------
-- 3. DEMOTE ADMIN TO REGULAR USER
-- ----------------------------------------------------------------------------
UPDATE user_profiles 
SET 
    role = 'user',
    updated_at = now() 
WHERE email = 'admin@example.com';

-- ----------------------------------------------------------------------------
-- 4. DEACTIVATE USER ACCOUNT
-- ----------------------------------------------------------------------------
UPDATE user_profiles 
SET 
    is_active = false,
    updated_at = now() 
WHERE email = 'user@example.com';

-- ----------------------------------------------------------------------------
-- 5. REACTIVATE USER ACCOUNT
-- ----------------------------------------------------------------------------
UPDATE user_profiles 
SET 
    is_active = true,
    updated_at = now() 
WHERE email = 'user@example.com';

-- ----------------------------------------------------------------------------
-- 6. VIEW USER STATISTICS
-- ----------------------------------------------------------------------------
SELECT 
    up.email,
    up.first_name,
    up.last_name,
    up.role,
    COALESCE(uus.contracts_reviewed, 0) as contracts_reviewed,
    COALESCE(uus.total_pages_reviewed, 0) as pages_reviewed,
    COALESCE(uus.risk_assessments_completed, 0) as risk_assessments,
    COALESCE(uus.compliance_checks_completed, 0) as compliance_checks,
    uus.last_activity
FROM user_profiles up
LEFT JOIN user_usage_stats uus ON up.id = uus.user_id
ORDER BY up.created_at DESC;

-- ----------------------------------------------------------------------------
-- 7. VIEW ADMIN USERS ONLY
-- ----------------------------------------------------------------------------
SELECT 
    email, 
    first_name, 
    last_name, 
    created_at
FROM user_profiles 
WHERE role = 'admin' 
AND is_active = true
ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- 8. BULK PROMOTE MULTIPLE USERS TO ADMIN
-- ----------------------------------------------------------------------------
-- Replace emails in the array with actual emails
UPDATE user_profiles 
SET 
    role = 'admin',
    updated_at = now() 
WHERE email = ANY(ARRAY[
    'user1@example.com',
    'user2@example.com',
    'user3@example.com'
]);

-- ----------------------------------------------------------------------------
-- 9. VIEW RECENT USER ACTIVITY
-- ----------------------------------------------------------------------------
SELECT 
    up.email,
    ua.activity_type,
    ua.description,
    ua.created_at
FROM user_activities ua
JOIN user_profiles up ON ua.user_id = up.id
ORDER BY ua.created_at DESC
LIMIT 50;

-- ----------------------------------------------------------------------------
-- 10. INITIALIZE USAGE STATS FOR NEW USERS
-- ----------------------------------------------------------------------------
-- Run this if a user doesn't have usage stats initialized
INSERT INTO user_usage_stats (
    user_id, 
    contracts_reviewed, 
    total_pages_reviewed, 
    risk_assessments_completed, 
    compliance_checks_completed
)
SELECT 
    id, 0, 0, 0, 0
FROM user_profiles 
WHERE id NOT IN (SELECT user_id FROM user_usage_stats)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- QUICK SETUP FOR NEW ADMIN USERS
-- ============================================================================

-- Step 1: Have users sign up through your app first with these credentials:
-- Email: arunendu.mazumder@maigon.io | Password: Admin2024!Mx9
-- Email: jim.runsten@maigon.io | Password: Admin2024!Jr7  
-- Email: andreas.borjesson@maigon.io | Password: Admin2024!Ab5
-- Email: erica.antonovic@maigon.io | Password: Admin2024!Ea3

-- Step 2: After they sign up, run this to make them admins:
/*
UPDATE user_profiles 
SET role = 'admin', updated_at = now() 
WHERE email IN (
    'arunendu.mazumder@maigon.io',
    'jim.runsten@maigon.io',
    'andreas.borjesson@maigon.io',
    'erica.antonovic@maigon.io'
);
*/

-- Step 3: Verify admin accounts:
/*
SELECT email, first_name, last_name, role 
FROM user_profiles 
WHERE role = 'admin';
*/
