# 🔧 Fix AI Function Deployment

## ❌ **The Issue**
The deployment failed because:
1. Docker is not running (warning, but not critical)
2. Command was run from wrong directory
3. Supabase couldn't find the function file

## ✅ **Solution: Run from Project Root**

**Make sure you're in the main project directory** (where package.json is), then run:

```bash
# 1. Navigate to project root (where package.json is located)
cd /path/to/your/maigon-project

# 2. Verify you're in the right place
ls -la
# You should see: package.json, supabase/, client/, etc.

# 3. Deploy the function
npx supabase functions deploy analyze-contract --project-ref cqvufndxjakdbmbjhwlx
```

## 🐳 **Optional: Fix Docker Warning**

If you want to eliminate the Docker warning:
```bash
# Start Docker (if installed)
sudo systemctl start docker
# OR on macOS: start Docker Desktop app
```

## 🔍 **Verify File Structure**

Your structure should look like this:
```
your-project/
├── package.json
├── supabase/
│   └── functions/
│       └── analyze-contract/
│           └── index.ts ✅ (exists!)
└── client/
    └── ...
```

## 🚀 **Complete Deployment Commands**

Run these from your **project root directory**:

```bash
# 1. Deploy AI function
npx supabase functions deploy analyze-contract --project-ref cqvufndxjakdbmbjhwlx

# 2. Set OpenAI API key
npx supabase secrets set OPENAI_API_KEY=your_openai_key_here --project-ref cqvufndxjakdbmbjhwlx

# 3. Verify deployment
npx supabase functions list --project-ref cqvufndxjakdbmbjhwlx
```

## 📋 **Expected Output**

After successful deployment, you should see:
```
✅ Successfully deployed function analyze-contract
```

Then list should show:
```
analyze-contract
send-welcome-email-sendgrid  
send-password-reset-sendgrid
```

## 🧪 **Test After Deployment**

1. Upload the sample contract from `SAMPLE_CONTRACT_FOR_TESTING.md`
2. Select "Risk Assessment" 
3. Verify you get **real AI analysis** instead of mock data!

The analysis will now include:
- Detailed risk identification
- Professional recommendations  
- Impact scores
- Confidence breakdowns
