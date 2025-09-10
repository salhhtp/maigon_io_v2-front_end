# SendGrid Production Deployment Guide

## 🚀 **IMMEDIATE ACTION REQUIRED**

Your SendGrid Edge Functions are ready for deployment. Follow these steps to complete the production setup:

### **Step 1: Deploy Edge Functions**

```bash
# Deploy the SendGrid welcome email function
supabase functions deploy send-welcome-email-sendgrid --project-ref cqvufndxjakdbmbjhwlx

# Deploy the SendGrid password reset function  
supabase functions deploy send-password-reset-sendgrid --project-ref cqvufndxjakdbmbjhwlx
```

### **Step 2: Configure SendGrid Environment Variables**

Set these required secrets in Supabase:

```bash
# Required for email functionality
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key_here --project-ref cqvufndxjakdbmbjhwlx
supabase secrets set SENDGRID_FROM_EMAIL=noreply@yourdomain.com --project-ref cqvufndxjakdbmbjhwlx

# Optional (for dynamic templates)
supabase secrets set SENDGRID_WELCOME_TEMPLATE_ID=d-your_welcome_template_id --project-ref cqvufndxjakdbmbjhwlx
supabase secrets set SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-your_reset_template_id --project-ref cqvufndxjakdbmbjhwlx
```

### **Step 3: SendGrid Account Setup**

1. **Create SendGrid Account** at https://sendgrid.com
2. **Generate API Key**:
   - Go to Settings > API Keys
   - Create new API key with "Mail Send" permissions
   - Copy the key (you won't see it again!)

3. **Domain Authentication** (Recommended):
   - Go to Settings > Sender Authentication > Domain Authentication
   - Add your domain (e.g., `yourdomain.com`)
   - Add the provided DNS records to your domain
   - Verify domain authentication

4. **Single Sender Verification** (Alternative):
   - Go to Settings > Sender Authentication > Single Sender Verification
   - Verify the email address you'll send from

### **Step 4: Test Email Functionality**

After deployment, test the email system:

1. Create a new account via signup
2. Check that welcome email is sent
3. Test password reset functionality
4. Monitor SendGrid Activity Feed for delivery status

### **Step 5: Production Configuration**

Update your production domain in the email service:

```typescript
// In client/services/emailService.ts, update loginUrl for production
const loginUrl = 'https://yourdomain.com/signin'; // Replace with actual production URL
```

## 📊 **Monitoring**

- **SendGrid Activity Feed**: Monitor email delivery in real-time
- **Supabase Logs**: Check Edge Function execution logs
- **Error Tracking**: Set up alerts for email delivery failures

## 🔧 **Troubleshooting**

### Common Issues:

1. **403 Forbidden**: Check API key permissions
2. **401 Unauthorized**: Verify API key is correct
3. **Domain not authenticated**: Complete domain verification
4. **Template not found**: Check template ID and ensure it's published

### Debug Mode:

The functions include development fallbacks that log email data to console when SendGrid isn't configured.

## ✅ **Completion Checklist**

- [ ] Deploy both SendGrid Edge Functions
- [ ] Set SENDGRID_API_KEY secret
- [ ] Set SENDGRID_FROM_EMAIL secret  
- [ ] Complete domain authentication in SendGrid
- [ ] Test signup email delivery
- [ ] Test password reset email delivery
- [ ] Verify emails land in inbox (not spam)
- [ ] Monitor SendGrid Activity Feed
- [ ] Update production domain in email service

---

**⚠️ CRITICAL**: Without these steps, users won't receive welcome emails or be able to reset passwords in production!
