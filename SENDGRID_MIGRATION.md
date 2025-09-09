# Migration from Resend to SendGrid

This document outlines the migration from Resend to SendGrid for email management in the Maigon application.

## Why We Migrated to SendGrid

### Advantages of SendGrid over Resend

1. **Superior Deliverability**
   - Better sender reputation management
   - Advanced IP warming and management
   - Comprehensive deliverability tools

2. **Advanced Template System**
   - Visual drag-and-drop template editor
   - Dynamic template versioning
   - A/B testing capabilities
   - Better template management

3. **Enterprise Features**
   - Comprehensive analytics and reporting
   - Event webhooks for detailed tracking
   - Advanced segmentation
   - Dedicated IP options

4. **Better Support and Documentation**
   - Extensive documentation and guides
   - Better customer support
   - Larger community and resources

## What Changed

### Environment Variables

**Old (Resend):**
```bash
RESEND_API_KEY=your_resend_api_key
```

**New (SendGrid):**
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_WELCOME_TEMPLATE_ID=d-template_id (optional)
SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-template_id (optional)
```

### Edge Functions

**Old Functions:**
- `send-welcome-email` (Resend-based)
- `send-password-reset` (Resend-based)

**New Functions:**
- `send-welcome-email-sendgrid`
- `send-password-reset-sendgrid`

### API Calls

The client-side code automatically uses the new SendGrid functions. No changes needed in your frontend application.

## Migration Steps

### Step 1: Set Up SendGrid Account

1. Sign up for [SendGrid](https://sendgrid.com)
2. Complete account verification
3. Create API key with "Mail Send" permissions
4. Set up domain authentication (recommended)

### Step 2: Deploy New Edge Functions

```bash
# Deploy new SendGrid functions
supabase functions deploy send-welcome-email-sendgrid
supabase functions deploy send-password-reset-sendgrid

# (Optional) Remove old Resend functions
supabase functions delete send-welcome-email
supabase functions delete send-password-reset
```

### Step 3: Update Environment Variables

```bash
# Remove old Resend variables
supabase secrets unset RESEND_API_KEY

# Set new SendGrid variables
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key
supabase secrets set SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Step 4: (Optional) Set Up Dynamic Templates

1. Create welcome email template in SendGrid
2. Create password reset template in SendGrid
3. Set template IDs:

```bash
supabase secrets set SENDGRID_WELCOME_TEMPLATE_ID=d-your_template_id
supabase secrets set SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-your_template_id
```

### Step 5: Test the Migration

1. Test user signup with email delivery
2. Test password reset functionality
3. Verify emails are delivered properly
4. Check SendGrid Activity Feed for delivery status

## Rollback Plan

If you need to rollback to Resend:

1. Keep the old environment variables
2. Redeploy the original Resend functions
3. Update `emailService.ts` to use the old function names

However, we strongly recommend staying with SendGrid for the improved features and deliverability.

## Benefits You'll See

### Improved Deliverability
- Better inbox placement rates
- Reduced chance of emails being marked as spam
- Professional sender reputation

### Better Analytics
- Detailed delivery and engagement metrics
- Real-time monitoring
- Bounce and complaint tracking

### Enhanced Templates
- Professional-looking emails
- Easy template updates without code changes
- A/B testing capabilities

### Scalability
- Handle high-volume email sending
- Better performance under load
- Enterprise-grade infrastructure

## Troubleshooting

### Common Issues After Migration

1. **Emails not sending:**
   - Check SendGrid API key permissions
   - Verify domain authentication
   - Check Supabase function logs

2. **Template errors:**
   - Verify template IDs are correct
   - Ensure templates are published
   - Check dynamic variable names

3. **Deliverability issues:**
   - Complete domain authentication
   - Warm up your sending domain
   - Monitor SendGrid reputation metrics

### Getting Help

1. **SendGrid Issues:** Check SendGrid's status page and documentation
2. **Function Issues:** Review Supabase Edge Function logs
3. **Integration Issues:** Refer to this migration guide

## Monitoring Your Migration

### Key Metrics to Watch

1. **Delivery Rate:** Should improve with SendGrid
2. **Open Rate:** Monitor for any changes
3. **Bounce Rate:** Should decrease with better deliverability
4. **Complaint Rate:** Keep below 0.1%

### SendGrid Dashboard

Monitor these sections:
- **Activity Feed:** Real-time email status
- **Statistics:** Delivery and engagement metrics
- **Reputation Monitoring:** Sender reputation health
- **Suppressions:** Manage bounces and unsubscribes

## Next Steps

1. Monitor email performance for the first week
2. Set up SendGrid webhooks for advanced tracking (optional)
3. Create additional email templates as needed
4. Optimize template performance based on analytics
5. Consider implementing advanced SendGrid features

The migration to SendGrid provides a more robust, scalable, and professional email infrastructure for your application.
