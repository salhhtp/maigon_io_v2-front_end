// Admin Account Setup Script
// Run this in the browser console on your app to create the admin account

async function createAdminAccount() {
  try {
    console.log('Creating admin account...');
    
    // Import Supabase client (assuming it's available globally or import it)
    const { supabase } = window;
    
    if (!supabase) {
      console.error('Supabase client not found. Make sure you are on the app page.');
      return;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@maigon.io',
      password: 'Admin123!',
      options: {
        emailRedirectTo: window.location.origin + '/dashboard',
        data: {
          first_name: 'Super',
          last_name: 'Admin',
          company: 'Maigon',
          role: 'admin'
        }
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return;
    }

    console.log('Auth user created:', authData);

    // Update user profile with auth_user_id
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          auth_user_id: authData.user.id,
          role: 'admin',
          is_active: true
        })
        .eq('email', 'admin@maigon.io');

      if (profileError) {
        console.error('Profile update error:', profileError);
      } else {
        console.log('✅ Admin account created successfully!');
        console.log('Email: admin@maigon.io');
        console.log('Password: Admin123!');
        console.log('Role: admin');
        console.log('');
        console.log('🔐 You can now sign in with these credentials.');
        console.log('📧 Check your email for verification if required.');
      }
    }

  } catch (error) {
    console.error('Setup error:', error);
  }
}

// Run the setup
createAdminAccount();
