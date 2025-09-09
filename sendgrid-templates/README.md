# SendGrid Dynamic Templates for Maigon

This folder contains HTML templates that can be used to create SendGrid dynamic templates for better email management.

## Templates Included

### 1. Welcome Email Template (`welcome-email-template.html`)
Used when new users sign up and receive their temporary credentials.

**Dynamic Variables Used:**
- `{{firstName}}` - User's first name
- `{{temporaryPassword}}` - Generated temporary password
- `{{loginUrl}}` - URL to the sign-in page
- `{{year}}` - Current year for footer
- `{{to}}` - User's email address (automatically provided by SendGrid)

### 2. Password Reset Template (`password-reset-template.html`)
Used when users request a password reset.

**Dynamic Variables Used:**
- `{{resetUrl}}` - URL to reset password page
- `{{year}}` - Current year for footer

## How to Set Up Dynamic Templates in SendGrid

### Step 1: Access Dynamic Templates
1. Log in to your SendGrid account
2. Go to **Email API** > **Dynamic Templates**
3. Click **Create a Dynamic Template**

### Step 2: Create Welcome Email Template
1. Name: "Maigon Welcome Email"
2. Click **Add Version**
3. Choose **Code Editor**
4. Copy and paste the content from `welcome-email-template.html`
5. Click **Save**
6. Test the template using the **Send Test** feature
7. Note the Template ID (starts with `d-`)

### Step 3: Create Password Reset Template
1. Create another dynamic template
2. Name: "Maigon Password Reset"
3. Follow the same process with `password-reset-template.html`
4. Note the Template ID

### Step 4: Configure Environment Variables
Add the template IDs to your Supabase environment:

```bash
supabase secrets set SENDGRID_WELCOME_TEMPLATE_ID=d-your_welcome_template_id
supabase secrets set SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-your_reset_template_id
```

## Testing Templates

### Test Data for Welcome Email
```json
{
  "firstName": "John",
  "temporaryPassword": "TempPass123!",
  "loginUrl": "https://yourapp.com/signin",
  "year": 2024
}
```

### Test Data for Password Reset
```json
{
  "resetUrl": "https://yourapp.com/reset-password?token=abc123",
  "year": 2024
}
```

## Template Features

### Responsive Design
- Mobile-friendly layout
- Optimized for all email clients
- Proper viewport settings

### Accessibility
- Clear color contrast
- Readable fonts
- Proper heading structure
- Alt text for important elements

### Security Features
- Clear security warnings
- Expiration notices
- Safe link handling
- Professional security messaging

## Customization Tips

### Branding
- Update colors in the CSS to match your brand
- Replace the logo text with your company logo image
- Modify fonts to match your brand guidelines

### Content
- Adjust messaging to match your tone of voice
- Add additional security information if needed
- Include contact information for support

### Design
- Add your company logo as an image
- Customize the color scheme
- Adjust spacing and layout as needed

## Advanced Features

### A/B Testing
SendGrid allows you to create multiple versions of templates for A/B testing:
1. Create different versions with varying subject lines
2. Test different call-to-action button colors
3. Compare different email layouts

### Analytics
Track template performance:
- Open rates
- Click-through rates
- Delivery success rates
- Bounce rates

### Personalization
Add more dynamic content:
- User's company name
- Account type
- Usage statistics
- Personalized recommendations

## Troubleshooting

### Template Not Found
- Verify template ID is correct
- Ensure template is published (not in draft mode)
- Check environment variables are set correctly

### Variables Not Rendering
- Verify variable names match exactly (case-sensitive)
- Ensure all required variables are provided in the API call
- Check for typos in variable names

### Styling Issues
- Test in multiple email clients
- Use inline CSS for better compatibility
- Avoid complex CSS features not supported by email clients

## Maintenance

### Regular Updates
- Review templates quarterly for brand consistency
- Update year variables in footers
- Refresh security messaging as needed
- Test templates after SendGrid platform updates

### Performance Monitoring
- Monitor delivery rates
- Track user engagement metrics
- Review spam complaints
- Analyze bounce rates

## Support

For issues related to:
- **SendGrid Platform**: Contact SendGrid support
- **Template Design**: Refer to SendGrid's template documentation
- **Integration Issues**: Check Supabase Edge Function logs
- **Email Delivery**: Review SendGrid Activity Feed
