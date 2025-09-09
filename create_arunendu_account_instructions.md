# Create Arunendu's Account

Since the previous account had authentication issues, here's how to recreate it properly:

## Method 1: Using Browser Console (Recommended)

1. Open your browser's developer console (F12)
2. Navigate to your application in the browser
3. Run this JavaScript code in the console:

```javascript
// Import Supabase (if not already available)
const { createClient } = supabase || window.supabase;

// Create client (using your app's existing connection)
const client = createClient(
  'https://cqvufndxjakdbmbjhwlx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdnVmbmR4amFrZGJtYmpod2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MDAwNzMsImV4cCI6MjA3MDE3NjA3M30.pGmQIWmrTODu1r2cWuOzr9W0hre7eHblU2q9OWPZXPk'
);

// Create the account
client.auth.signUp({
  email: 'arunendu.mazumder@maigon.io',
  password: 'Admin2024!Mx9',
  options: {
    data: {
      first_name: 'Arunendu',
      last_name: 'Mazumder',
      company: 'Maigon',
      phone: '+4748629416',
      company_size: '11-50',
      country_region: 'se',
      industry: 'legal',
    }
  }
}).then(result => {
  console.log('Account creation result:', result);
});
```

## Method 2: Run SQL to confirm email after account creation

After creating the account, run this SQL in your Supabase dashboard:

```sql
-- Confirm Arunendu's email
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), 
    '{email_verified}', 
    'true'::jsonb
  )
WHERE email = 'arunendu.mazumder@maigon.io';
```

## Method 3: Use SignUp Page

1. Go to `/signup` page in your application
2. Sign up with these details:
   - Email: `arunendu.mazumder@maigon.io`
   - First Name: `Arunendu`
   - Last Name: `Mazumder`
   - Company: `Maigon`
   - Phone: `+4748629416`
   - Company Size: `11-50`
   - Country: `se`
   - Industry: `legal`
3. Then manually set the password to `Admin2024!Mx9` using Supabase dashboard

## Expected Result

After successful account creation, you should be able to sign in with:
- **Email:** `arunendu.mazumder@maigon.io`
- **Password:** `Admin2024!Mx9`

## Clean Up

After verifying the account works, remove this file and the `confirm_arunendu_email.sql` file as they contain sensitive information.
