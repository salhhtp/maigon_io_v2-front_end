import { supabase } from "@/lib/supabase";

export const resetUserPassword = async (email: string, newPassword: string) => {
  try {
    // Get the user by email
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error fetching users:', getUserError);
      return { success: false, message: 'Failed to fetch user data' };
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, message: 'Failed to update password' };
    }

    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
};

export const confirmUserEmail = async (email: string) => {
  try {
    // Get the user by email
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error fetching users:', getUserError);
      return { success: false, message: 'Failed to fetch user data' };
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Confirm the user's email
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          email_verified: true
        }
      }
    );

    if (confirmError) {
      console.error('Error confirming email:', confirmError);
      return { success: false, message: 'Failed to confirm email' };
    }

    return { success: true, message: 'Email confirmed successfully' };
  } catch (error) {
    console.error('Email confirmation error:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
};
