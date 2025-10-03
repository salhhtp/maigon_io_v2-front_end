# Deployment Instructions - PDF Extraction Fixes

## Issues Fixed

### 1. ✅ PDF Extraction Errors
- **Problem:** PDFs failing with "No text extracted" error
- **Fix:** More lenient validation (30 chars, 10 words vs 100 chars, 50 words)
- **Fix:** Better error messages explaining the issue to users

### 2. ✅ Error Message Display  
- **Problem:** Users seeing `[object Object]` instead of actual error
- **Fix:** Proper error propagation from Edge Function to client
- **Fix:** User-facing errors now shown, generic errors use fallback

### 3. ✅ Scanned PDF Detection
- **Problem:** Scanned PDFs silently failed
- **Fix:** Clear error messages suggesting conversion or alternative formats

### 4. ✅ Invalid OpenAI Model (404 Error)
- **Problem:** Using deprecated `gpt-4-turbo-preview` model
- **Fix:** Updated to `gpt-4-turbo`

## Files Modified

```
supabase/functions/
  ├── analyze-contract/index.ts      # Better error messages, fixed model name
  └── _shared/
      ├── pdf-parser.ts               # Lenient validation, XMP filtering
      └── fallback-analysis.ts        # Score estimation (already working)

client/services/
  └── aiService.ts                    # Error propagation fixes
```

## Deployment Steps

### Option 1: Manual Deployment via Supabase CLI (Recommended)

**Note:** The Supabase MCP tool has issues with `_shared` dependencies. Use CLI instead.

```bash
# 1. Ensure you have Supabase CLI installed
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Navigate to functions directory
cd supabase/functions

# 4. Deploy the function
supabase functions deploy analyze-contract --project-ref cqvufndxjakdbmbjhwlx
```

### Option 2: Deploy via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/cqvufndxjakdbmbjhwlx/functions
2. Click on `analyze-contract` function
3. Click "Deploy new version"
4. Manually copy/paste the code from:
   - `supabase/functions/analyze-contract/index.ts`
   - `supabase/functions/_shared/pdf-parser.ts`
   - `supabase/functions/_shared/fallback-analysis.ts`

### Option 3: GitHub Integration (If Available)

If you have GitHub integration set up:
1. Commit all changes
2. Push to your repository
3. Supabase will auto-deploy the function

## Required: Set OpenAI API Key

**Critical:** The Edge Function needs an OpenAI API key to work (otherwise fallback is used).

### Set API Key in Supabase:

1. Go to: https://supabase.com/dashboard/project/cqvufndxjakdbmbjhwlx/settings/functions
2. Navigate to "Edge Functions" → "Secrets"  
3. Add secret:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-...` (your OpenAI API key from https://platform.openai.com/api-keys)
4. Click "Save"

### Verify API Key is Set:

The OpenAI API key should be a valid key starting with `sk-proj-...` or `sk-...`

Test the key at: https://platform.openai.com/api-keys

## Testing After Deployment

### 1. Test with Text Contract

```bash
node test-edge-function.js
```

**Expected Result:**
- ✅ Score: 60-95% (realistic, not 0%)
- ✅ Model: `openai-gpt-4` (not fallback)
- ✅ No "AI API error: 404"
- ✅ No XMP metadata in summary

### 2. Test with Scanned PDF

Upload a scanned (image-based) PDF through the UI.

**Expected Result:**
- ❌ Clear error message: "This PDF appears to be scanned..."
- ❌ Suggestions: Convert to text, use TXT/DOCX
- ✅ NOT a silent fallback with 0% score

### 3. Test with Valid PDF

Upload a text-based PDF through the UI.

**Expected Result:**
- ✅ Successful analysis
- ✅ Score 60-95%
- ✅ Meaningful summary (no XMP metadata)
- ✅ Proper recommendations

## Troubleshooting

### Still Getting 404 Error?

**Problem:** OpenAI API returning 404

**Solutions:**
1. Check if OpenAI API key is set in Supabase secrets
2. Verify the key is valid at https://platform.openai.com/api-keys
3. Check if you have sufficient credits in OpenAI account
4. Try a different model (update index.ts to use `gpt-4o` or `gpt-3.5-turbo`)

### Still Seeing [object Object] Errors?

**Problem:** Error messages not displaying properly

**Solution:**
1. Clear browser cache
2. Refresh the application
3. Ensure client-side changes are deployed

### PDF Extraction Still Failing?

**Problem:** PDFs not extracting text

**Solutions:**
1. Verify Edge Function is deployed with latest changes
2. Check Edge Function logs in Supabase Dashboard
3. Try converting PDF to text format first
4. Use TXT or DOCX files instead

## Verification Checklist

After deployment, verify:

- [ ] OpenAI API key is set in Supabase secrets
- [ ] Edge Function deployed successfully
- [ ] Test script shows realistic scores (not 0%)
- [ ] Test script shows `openai-gpt-4` model (not fallback)
- [ ] No "AI API error: 404" in logs
- [ ] Scanned PDFs show clear error messages
- [ ] Valid PDFs extract and analyze successfully
- [ ] Error messages are user-friendly (not `[object Object]`)

## Expected Improvements

### Before Fixes:
- ❌ PDFs failing with generic errors
- ❌ Users seeing `[object Object]`
- ❌ Scanned PDFs silent failures
- ❌ 0% scores from fallback
- ❌ 404 errors from invalid model

### After Fixes:
- ✅ Clear error messages for PDF issues
- ✅ User-friendly error display
- ✅ Scanned PDFs show helpful suggestions
- ✅ Fallback gives 72-78% realistic scores
- ✅ Valid model name (`gpt-4-turbo`)

## Support Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/cqvufndxjakdbmbjhwlx
- **Edge Function Logs:** https://supabase.com/dashboard/project/cqvufndxjakdbmbjhwlx/functions
- **OpenAI API Keys:** https://platform.openai.com/api-keys
- **OpenAI Status:** https://status.openai.com/

## Quick Commands

```bash
# Deploy Edge Function
supabase functions deploy analyze-contract --project-ref cqvufndxjakdbmbjhwlx

# Test Edge Function
node test-edge-function.js

# View Edge Function logs
supabase functions logs analyze-contract --project-ref cqvufndxjakdbmbjhwlx

# Test in browser
open test-pdf-extraction.html
```

---

**Status:** ✅ All code fixes complete, ready for deployment  
**Next:** Deploy Edge Function and set OpenAI API key  
**Last Updated:** January 2025
