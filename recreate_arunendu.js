// Script to recreate Arunendu's account with proper credentials
// Run this in the browser console on your Supabase dashboard or use Supabase CLI

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cqvufndxjakdbmbjhwlx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdnVmbmR4amFrZGJtYmpod2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MDAwNzMsImV4cCI6MjA3MDE3NjA3M30.pGmQIWmrTODu1r2cWuOzr9W0hre7eHblU2q9OWPZXPk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function recreateArunendu() {
  try {
    // Sign up Arunendu with the expected credentials
    const { data, error } = await supabase.auth.signUp({
      email: 'arunendu.mazumder@maigon.io',
      password: 'Admin2024!Mx9',
      options: {
        data: {
          first_name: 'Arunendu',
          last_name: 'Mazumder',
          company: 'Maigon',
          phone: '+4748629416',
          company_size: '11-50',
          country_region: 'se',
          industry: 'legal',
        }
      }
    })

    if (error) {
      console.error('Error creating user:', error)
      return
    }

    console.log('User created successfully:', data.user?.email)
    
    // Confirm email manually
    if (data.user) {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        data.user.id,
        { email_confirm: true }
      )
      
      if (confirmError) {
        console.error('Error confirming email:', confirmError)
      } else {
        console.log('Email confirmed successfully')
      }
    }
    
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

recreateArunendu()
