# Domain & DNS Configuration Guide

## 🌐 **Domain Setup Overview**

This guide covers setting up a custom domain for the Maigon production deployment. This is a manual process that requires access to your domain registrar and hosting platform.

## 📋 **Prerequisites**

- Domain name purchased (e.g., `maigon.io`, `yourcompany.com`)
- Access to domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
- Hosting platform chosen (Netlify recommended)
- SSL certificate provider (usually included with hosting)

## 🚀 **Netlify Deployment Setup**

### **Step 1: Deploy to Netlify**

#### **Option A: Connect via MCP Integration**
1. [Connect to Netlify](#open-mcp-popover) via MCP integration
2. Follow the automated deployment process

#### **Option B: Manual Netlify Setup**
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "New site from Git"
3. Connect your repository
4. Configure build settings:
   ```
   Build command: npm run build
   Publish directory: dist/spa
   ```
5. Deploy the site

### **Step 2: Configure Custom Domain in Netlify**
1. Go to Site Settings > Domain management
2. Click "Add custom domain"
3. Enter your domain name (e.g., `maigon.io`)
4. Netlify will provide DNS configuration instructions

### **Step 3: Netlify DNS Configuration**

Netlify will show you the DNS records to configure:

```
Type: A
Name: @ (or leave blank)
Value: 75.2.60.5

Type: CNAME  
Name: www
Value: your-site-name.netlify.app
```

*Note: Actual IP addresses may vary - use the values provided by Netlify*

## 🔧 **DNS Configuration at Domain Registrar**

### **Option A: Use Netlify DNS (Recommended)**
1. In Netlify Dashboard, go to Site Settings > Domain management
2. Click "Set up Netlify DNS"
3. Update nameservers at your domain registrar to:
   ```
   dns1.p03.nsone.net
   dns2.p03.nsone.net  
   dns3.p03.nsone.net
   dns4.p03.nsone.net
   ```
   *Note: Actual nameservers will be provided by Netlify*

### **Option B: Configure DNS Records Manually**

If you prefer to keep your existing DNS provider:

#### **For GoDaddy:**
1. Log into GoDaddy Domain Manager
2. Go to DNS Management
3. Add/modify these records:
   ```
   Type: A, Name: @, Value: [Netlify IP]
   Type: CNAME, Name: www, Value: [your-site].netlify.app
   ```

#### **For Cloudflare:**
1. Log into Cloudflare Dashboard
2. Select your domain
3. Go to DNS > Records
4. Add these records:
   ```
   Type: A, Name: @, Content: [Netlify IP], Proxy: On
   Type: CNAME, Name: www, Content: [your-site].netlify.app, Proxy: On
   ```

#### **For Namecheap:**
1. Log into Namecheap Account
2. Go to Domain List > Manage
3. Advanced DNS tab
4. Add these records:
   ```
   Type: A Record, Host: @, Value: [Netlify IP]
   Type: CNAME, Host: www, Value: [your-site].netlify.app
   ```

## 🔒 **SSL Certificate Configuration**

### **Netlify SSL (Automatic)**
1. Go to Site Settings > Domain management
2. HTTPS section should show "Certificate provisioning"
3. Wait for automatic SSL certificate provision (usually 1-24 hours)
4. Verify HTTPS is working: `https://yourdomain.com`

### **Force HTTPS Redirect**
1. In Netlify Site Settings > Domain management
2. Enable "Force TLS connections"
3. This redirects all HTTP traffic to HTTPS

## 📧 **Email-Related DNS Records**

### **For SendGrid Email Delivery**
Add these DNS records for better email deliverability:

```
Type: CNAME
Name: em1234.yourdomain.com
Value: u1234567.sendgrid.net

Type: CNAME  
Name: s1._domainkey.yourdomain.com
Value: s1.domainkey.u1234567.sendgrid.net

Type: CNAME
Name: s2._domainkey.yourdomain.com  
Value: s2.domainkey.u1234567.sendgrid.net
```

*Note: Actual values will be provided by SendGrid during domain authentication*

### **SPF Record (Recommended)**
```
Type: TXT
Name: @
Value: v=spf1 include:sendgrid.net ~all
```

### **DMARC Record (Optional)**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com
```

## 🧪 **Testing & Verification**

### **DNS Propagation Check**
Use online tools to verify DNS propagation:
- [DNS Checker](https://dnschecker.org/)
- [What's My DNS](https://www.whatsmydns.net/)
- Command line: `dig yourdomain.com` or `nslookup yourdomain.com`

### **SSL Certificate Verification**
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- Check for A+ security rating
- Verify all security headers are present

### **Email Deliverability Test**
- [Mail Tester](https://www.mail-tester.com/)
- Send test emails from your application
- Check spam score and deliverability

## 🔧 **Environment Variables Update**

Once domain is configured, update these environment variables:

```bash
# Update in your deployment platform
VITE_APP_URL=https://yourdomain.com

# Update in Supabase Auth settings
Site URL: https://yourdomain.com
Redirect URLs:
- https://yourdomain.com/auth/callback
- https://yourdomain.com/email-verification  
- https://yourdomain.com/reset-password
```

## 📊 **Performance Optimization for Custom Domain**

### **CDN Configuration (Optional)**
If using Cloudflare as DNS provider:
1. Enable Cloudflare proxy (orange cloud)
2. Configure caching rules
3. Enable Brotli compression
4. Set up page rules for optimization

### **Performance Testing**
After domain setup, test performance:
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [GTmetrix](https://gtmetrix.com/)
- [WebPageTest](https://www.webpagetest.org/)

## 🚨 **Common Issues & Solutions**

### **DNS Not Propagating**
- **Issue**: Domain doesn't resolve to new server
- **Solution**: Wait 24-48 hours for full propagation
- **Check**: Use different DNS checker tools

### **SSL Certificate Not Provisioning**
- **Issue**: HTTPS not working after domain setup
- **Solution**: Ensure DNS is properly configured, wait for propagation
- **Check**: Verify A/CNAME records are correct

### **Email Delivery Issues**
- **Issue**: Emails going to spam or not delivering
- **Solution**: Complete SendGrid domain authentication
- **Check**: Verify SPF, DKIM, and DMARC records

### **Mixed Content Warnings**
- **Issue**: HTTP resources on HTTPS site
- **Solution**: Update all URLs to use HTTPS
- **Check**: Browser developer console for mixed content errors

## 📋 **Post-Configuration Checklist**

### **Immediate Verification:**
- [ ] Domain resolves to your site
- [ ] HTTPS is working and forced
- [ ] SSL certificate is valid (A+ rating)
- [ ] All pages load correctly
- [ ] Email system works properly
- [ ] No mixed content warnings

### **Performance Verification:**
- [ ] PageSpeed Insights score > 90
- [ ] Core Web Vitals all green  
- [ ] DNS lookup time < 100ms
- [ ] First byte time < 200ms

### **Security Verification:**
- [ ] Security headers properly configured
- [ ] SSL Labs A+ rating
- [ ] No security warnings in browser
- [ ] CSP (Content Security Policy) working

## 🎯 **DNS Propagation Timeline**

| Record Type | Typical Propagation Time |
|-------------|-------------------------|
| A Record    | 1-4 hours              |
| CNAME       | 1-4 hours              |
| TXT (SPF)   | 1-4 hours              |
| MX Record   | 1-4 hours              |
| Full Global | 24-48 hours            |

## 📞 **Support Resources**

### **Netlify Support:**
- [Netlify Docs](https://docs.netlify.com/)
- [Custom Domain Setup](https://docs.netlify.com/domains-https/custom-domains/)

### **DNS Help:**
- [Cloudflare Learning Center](https://www.cloudflare.com/learning/dns/)
- [DNS Propagation Checker](https://dnschecker.org/)

### **SSL/TLS Help:**
- [SSL Labs](https://www.ssllabs.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**⚠️ Important Notes:**
- DNS changes can take 24-48 hours to fully propagate globally
- Always test from multiple locations and devices
- Keep old DNS settings handy in case rollback is needed
- Contact your domain registrar if you encounter issues with DNS management

**🎯 This is the final manual step before your production launch!**
