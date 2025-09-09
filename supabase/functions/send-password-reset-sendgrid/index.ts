import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@maigon.io'
const SENDGRID_PASSWORD_RESET_TEMPLATE_ID = Deno.env.get('SENDGRID_PASSWORD_RESET_TEMPLATE_ID')

interface PasswordResetRequest {
  to: string
  resetUrl: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, resetUrl }: PasswordResetRequest = await req.json()

    if (!to || !resetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          dev_info: { to, resetUrl }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare email payload
    let emailPayload

    if (SENDGRID_PASSWORD_RESET_TEMPLATE_ID) {
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
              resetUrl,
              year: new Date().getFullYear()
            }
          }
        ],
        template_id: SENDGRID_PASSWORD_RESET_TEMPLATE_ID
      }
    } else {
      // Use inline HTML if no template configured
      const htmlContent = generatePasswordResetEmailHTML(resetUrl, to)
      
      emailPayload = {
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: 'Maigon'
        },
        personalizations: [
          {
            to: [{ email: to }],
            subject: 'Reset Your Maigon Password'
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
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password reset email sent successfully via SendGrid',
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
          error: 'Failed to send password reset email via SendGrid',
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

function generatePasswordResetEmailHTML(resetUrl: string, email: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Maigon Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9f8f8; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; margin-top: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 32px; font-weight: bold; color: #9A7C7C; margin-bottom: 20px; }
        .content { line-height: 1.6; color: #333; }
        .button { display: inline-block; padding: 14px 28px; background-color: #9A7C7C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; color: #856404; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        .security-note { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MAIGON</div>
          <h1 style="color: #333; margin: 0;">Reset Your Password</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          
          <p>You requested to reset your password for your Maigon account associated with <strong>${email}</strong>.</p>
          
          <p>Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Your Password</a>
          </div>
          
          <p style="text-align: center; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #9A7C7C; word-break: break-all;">${resetUrl}</a></p>
          
          <div class="warning">
            <p style="margin: 0;"><strong>⏰ Important:</strong> This password reset link will expire in 24 hours for security reasons.</p>
          </div>
          
          <div class="security-note">
            <h3 style="margin-top: 0; color: #dc3545;">Security Notice</h3>
            <p style="margin-bottom: 0;">If you didn't request this password reset, please ignore this email. Your account remains secure and no changes have been made.</p>
          </div>
          
          <p>For additional security questions or if you continue to have trouble accessing your account, please contact our support team.</p>
          
          <p>Best regards,<br><strong>The Maigon Security Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This email was sent to ${email} from Maigon's password reset system.</p>
          <p>&copy; ${new Date().getFullYear()} Maigon. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
