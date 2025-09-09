import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@maigon.io'
const SENDGRID_WELCOME_TEMPLATE_ID = Deno.env.get('SENDGRID_WELCOME_TEMPLATE_ID')

interface WelcomeEmailRequest {
  to: string
  firstName: string
  temporaryPassword: string
  loginUrl: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, firstName, temporaryPassword, loginUrl }: WelcomeEmailRequest = await req.json()

    // Validate required fields
    if (!to || !firstName || !temporaryPassword || !loginUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          dev_info: {
            to,
            firstName,
            temporaryPassword,
            loginUrl,
            message: 'In development: SendGrid API key not configured'
          }
        }),
        { 
          status: 200, // Return 200 for dev purposes
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare email payload
    let emailPayload

    if (SENDGRID_WELCOME_TEMPLATE_ID) {
      // Use dynamic template if configured
      emailPayload = {
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: 'Maigon'
        },
        personalizations: [
          {
            to: [{ email: to }],
            dynamic_template_data: {
              firstName,
              temporaryPassword,
              loginUrl,
              year: new Date().getFullYear()
            }
          }
        ],
        template_id: SENDGRID_WELCOME_TEMPLATE_ID
      }
    } else {
      // Use inline HTML if no template configured
      const htmlContent = generateWelcomeEmailHTML({ firstName, temporaryPassword, loginUrl, to })
      
      emailPayload = {
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: 'Maigon'
        },
        personalizations: [
          {
            to: [{ email: to }],
            subject: 'Welcome to Maigon - Your Login Credentials'
          }
        ],
        content: [
          {
            type: 'text/html',
            value: htmlContent
          }
        ]
      }
    }

    // Send email using SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    })

    if (response.ok || response.status === 202) {
      // SendGrid returns 202 for successful requests
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Welcome email sent successfully via SendGrid',
          messageId: response.headers.get('X-Message-Id')
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      const errorText = await response.text()
      console.error('SendGrid API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email via SendGrid',
          details: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Generate HTML email content (fallback if no template configured)
function generateWelcomeEmailHTML({ firstName, temporaryPassword, loginUrl, to }: { firstName: string, temporaryPassword: string, loginUrl: string, to: string }): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Maigon</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9f8f8; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; margin-top: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 32px; font-weight: bold; color: #9A7C7C; margin-bottom: 20px; }
        .content { line-height: 1.6; color: #333; }
        .credentials { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9A7C7C; }
        .button { display: inline-block; padding: 14px 28px; background-color: #9A7C7C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; color: #856404; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        .steps { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MAIGON</div>
          <h1 style="color: #333; margin: 0;">Welcome to Maigon!</h1>
        </div>
        
        <div class="content">
          <p>Hello ${firstName},</p>
          
          <p>Welcome to Maigon! Your account has been successfully created. We're excited to have you join our platform for AI-powered legal review.</p>
          
          <div class="credentials">
            <h3 style="margin-top: 0; color: #9A7C7C;">Your Login Credentials</h3>
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code></p>
          </div>
          
          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Important:</strong> This is a temporary password. You'll be prompted to change it when you first log in for security purposes.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button">Log In to Maigon</a>
          </div>
          
          <p style="text-align: center; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${loginUrl}" style="color: #9A7C7C;">${loginUrl}</a></p>
          
          <div class="steps">
            <h3 style="margin-top: 0; color: #333;">What's Next?</h3>
            <ol>
              <li>Click the login button above or visit our sign-in page</li>
              <li>Sign in using your email and temporary password</li>
              <li>Create a new, secure password</li>
              <li>Complete your profile setup</li>
              <li>Start your first contract review!</li>
            </ol>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br><strong>The Maigon Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This email was sent to ${to}. If you didn't create an account with Maigon, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} Maigon. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
