# 🔧 Admin User Management System

A Django-like admin user management system for creating admin users without going through the regular signup process.

## 🚀 Quick Setup (5 minutes)

### 1. Deploy the Admin Management Function

**Option A: Manual via Supabase Dashboard**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your project → Functions
2. Click "Create Function" → Name: `admin-user-management`
3. Copy the entire code from `supabase/functions/admin-user-management/index.ts`
4. Click "Deploy"

**Option B: CLI Deployment**

```bash
npx supabase functions deploy admin-user-management --project-ref cqvufndxjakdbmbjhwlx
```

### 2. Set Admin Management Key (Security)

In Supabase Dashboard → Settings → Secrets:

```
ADMIN_MANAGEMENT_KEY = your_secure_admin_key_here
```

Or via CLI:

```bash
npx supabase secrets set ADMIN_MANAGEMENT_KEY=your_secure_admin_key_here --project-ref cqvufndxjakdbmbjhwlx
```

### 3. Update Environment Variable

Add to your `.env` file:

```bash
ADMIN_MANAGEMENT_KEY=your_secure_admin_key_here
```

## 📝 Usage

### Create Admin User (like Django's createsuperuser)

```bash
# Interactive creation
npm run admin:create

# Or directly
node scripts/manage_admin.js create
```

**Example:**

```
🔧 Create Super Admin User
==============================

Email address: admin@maigon.io
Password: ********
First name: Super
Last name: Admin
Company (optional): Maigon

📤 Creating admin user...

✅ Admin user created successfully!
📧 Email: admin@maigon.io
👤 Name: Super Admin
🏢 Company: Maigon
🔐 Role: admin

🎉 The admin user can now sign in to the application!
```

### List All Admin Users

```bash
npm run admin:list
```

**Example Output:**

```
👥 Admin Users List
====================

📊 Found 2 admin user(s):

1. Super Admin
   📧 Email: admin@maigon.io
   🏢 Company: Maigon
   📅 Created: 1/15/2025
   ✅ Active: Yes

2. John Developer
   📧 Email: john@maigon.io
   🏢 Company: Maigon
   📅 Created: 1/14/2025
   ✅ Active: Yes
```

### Delete Admin User

```bash
npm run admin:delete

# Or specify email directly
node scripts/manage_admin.js delete admin@example.com
```

### Help

```bash
npm run admin:help
```

## 🔐 Security Features

- **Admin Key Protection**: All operations require a secure admin management key
- **Auto Email Confirmation**: Admin users are automatically email-verified
- **Professional Plan**: Admin users get unlimited access
- **Proper Cleanup**: Failed operations are automatically cleaned up

## 🎯 What Gets Created

When you create an admin user, the system automatically:

1. **Auth User**: Creates user in Supabase auth with email confirmation
2. **User Profile**: Creates profile with admin role
3. **User Plan**: Assigns professional plan with unlimited features
4. **Usage Stats**: Initializes usage tracking
5. **Full Access**: Admin can access all features including:
   - Custom solution builder
   - Admin analytics dashboard
   - User management
   - System monitoring

## 🆚 Django Comparison

| Django                             | Maigon Admin Management |
| ---------------------------------- | ----------------------- |
| `python manage.py createsuperuser` | `npm run admin:create`  |
| Interactive prompts                | Interactive prompts     |
| Database direct access             | Supabase Edge Function  |
| Built-in command                   | Custom CLI script       |

## 🔧 Technical Details

### Architecture

```
CLI Script (manage_admin.js)
     ↓ HTTPS Request
Supabase Edge Function (admin-user-management)
     ↓ Admin API Calls
Supabase Auth + Database
```

### Files Created

- `supabase/functions/admin-user-management/index.ts` - Edge function
- `scripts/manage_admin.js` - CLI management script
- `package.json` - Added npm scripts

### Environment Variables

- `ADMIN_MANAGEMENT_KEY` - Security key for admin operations
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## 🚨 Troubleshooting

### "Invalid admin management key"

- Make sure `ADMIN_MANAGEMENT_KEY` is set in both Supabase secrets and your `.env`
- Keys must match exactly

### "Function not found"

- Deploy the edge function first
- Check function name is exactly `admin-user-management`

### "Failed to create auth user"

- Check Supabase service role key permissions
- Ensure email doesn't already exist

### "Permission denied"

- Verify the admin management key
- Check Supabase project access

## 🎉 Success!

Once deployed, you can create admin users instantly without going through the regular signup flow, just like Django's admin system!

**Created admin users can immediately:**

- ✅ Sign in to the application
- ✅ Access admin dashboard
- ✅ Create custom solutions
- ✅ Manage users and analytics
- ✅ Use all AI features with unlimited quota
