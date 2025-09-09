import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface WelcomeEmailRequest {
  to: string
  firstName: string
  temporaryPassword: string
  loginUrl: string
  emailContent: string
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
    const { to, firstName, temporaryPassword, loginUrl, emailContent }: WelcomeEmailRequest = await req.json()

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

    // Check if RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          dev_info: {
            to,
            temporaryPassword,
            loginUrl,
            message: 'In development: Email would be sent with these credentials'
          }
        }),
        { 
          status: 200, // Return 200 for dev purposes
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Maigon <noreply@maigon.io>',
        to: [to],
        subject: 'Welcome to Maigon - Your Login Credentials',
        html: emailContent,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return new Response(
        JSON.stringify({ success: true, data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      const error = await res.text()
      console.error('Resend API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
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
