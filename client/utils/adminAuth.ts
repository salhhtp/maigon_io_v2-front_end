import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for admin operations
const getAdminClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('Service role key not available');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export const resetUserPasswordAdmin = async (userId: string, newPassword: string) => {
  try {
    const supabaseAdmin = getAdminClient();
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Admin password reset error:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Password reset successfully', data };
  } catch (error: any) {
    console.error('Admin client error:', error);
    return { success: false, message: error.message || 'Admin operation failed' };
  }
};

export const confirmUserEmailAdmin = async (userId: string) => {
  try {
    const supabaseAdmin = getAdminClient();
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (error) {
      console.error('Admin email confirmation error:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Email confirmed successfully', data };
  } catch (error: any) {
    console.error('Admin client error:', error);
    return { success: false, message: error.message || 'Admin operation failed' };
  }
};
