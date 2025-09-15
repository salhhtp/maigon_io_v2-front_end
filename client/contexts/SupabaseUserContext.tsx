import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";
import { DataService } from "@/services/dataService";
import { EmailService } from "@/services/emailService";

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  role: "user" | "admin";
  hasTemporaryPassword?: boolean; // Flag to indicate if user needs to change password
  // Mock plan and usage data for now - will be replaced with real data later
  plan: {
    type: "free_trial" | "pay_as_you_go" | "monthly_10" | "monthly_15" | "professional";
    name: string;
    price: number;
    contracts_limit: number;
    contracts_used: number;
    billing_cycle: "trial" | "per_contract" | "monthly" | "custom";
    next_billing_date?: string;
    trial_days_remaining?: number;
    features: string[];
  };
  usage: {
    total_reviews: number;
    this_month_reviews: number;
    success_rate: number;
    monthly_usage: Array<{
      month: string;
      reviews: number;
      max: number;
    }>;
  };
  billing: {
    current_bill: number;
    payment_method: string;
    billing_history: Array<{
      date: string;
      amount: number;
      status: "paid" | "pending" | "failed";
      invoice_id: string;
    }>;
  };
  recent_activity: Array<{
    action: string;
    file: string;
    time: string;
    status: "completed" | "processing" | "failed";
  }>;
  settings: {
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    two_factor_auth: boolean;
    auto_save: boolean;
    language: string;
    timezone: string;
  };
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
  isLoading: boolean;
  session: Session | null;
  signUp: (userData: SignUpData) => Promise<{ success: boolean; message: string; user?: SupabaseUser }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: User }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

export interface SignUpData {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone?: string;
  companySize?: string;
  countryRegion?: string;
  industry?: string;
  hearAboutUs?: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock data for plan, usage, billing, etc. - will be replaced with real data later
const getDefaultUserData = (profile: UserProfile): Omit<User, 'id' | 'name' | 'email' | 'company' | 'phone' | 'role'> => ({
  plan: {
    type: "free_trial",
    name: "Free Trial",
    price: 0,
    contracts_limit: 1,
    contracts_used: 0,
    billing_cycle: "trial",
    trial_days_remaining: 7,
    features: [
      "1 complete contract review",
      "Full compliance report",
      "All 7 contract modules",
      "7-day report storage",
    ],
  },
  usage: {
    total_reviews: 0,
    this_month_reviews: 0,
    success_rate: 0,
    monthly_usage: [
      { month: "Jan", reviews: 0, max: 1 },
      { month: "Feb", reviews: 0, max: 1 },
      { month: "Mar", reviews: 0, max: 1 },
      { month: "Apr", reviews: 0, max: 1 },
      { month: "May", reviews: 0, max: 1 },
      { month: "Jun", reviews: 0, max: 1 },
    ],
  },
  billing: {
    current_bill: 0,
    payment_method: "No payment method",
    billing_history: [],
  },
  recent_activity: [
    {
      action: "Account created",
      file: "Welcome to Maigon",
      time: "Today",
      status: "completed",
    },
  ],
  settings: {
    email_notifications: true,
    push_notifications: false,
    marketing_emails: true,
    two_factor_auth: false,
    auto_save: true,
    language: "en",
    timezone: "UTC",
  },
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert UserProfile to User format
  const convertProfileToUser = (profile: UserProfile, authUser?: SupabaseUser): User => {
    // Check if user has temporary password from auth metadata
    const hasTemporaryPassword = authUser?.user_metadata?.is_temporary_password === true;

    return {
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`,
      email: profile.email,
      company: profile.company,
      phone: profile.phone,
      role: profile.role as "user" | "admin",
      hasTemporaryPassword,
      ...getDefaultUserData(profile),
    };
  };

  // Load user profile from database
  const loadUserProfile = async (authUserId: string, retryCount = 0): Promise<User | null> => {
    try {
      console.log(`Loading user profile for auth user: ${authUserId}, attempt: ${retryCount + 1}`);

      // Get auth user data first
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Error getting auth user:', authError);
        throw authError;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.error(`Error loading user profile (attempt ${retryCount + 1}):`, error);

        // If profile not found and we haven't retried, try once more
        if (error.code === 'PGRST116' && retryCount === 0) {
          console.log('User profile not found, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return await loadUserProfile(authUserId, retryCount + 1);
        }

        throw error;
      }

      const user = convertProfileToUser(profile, authUser || undefined);
      console.log('User profile loaded successfully:', user.email);
      return user;
    } catch (error) {
      console.error(`Failed to load user profile after ${retryCount + 1} attempts:`, error);

      // If we've tried twice and still failed, sign out the user to clear inconsistent state
      if (retryCount > 0) {
        console.warn('Multiple profile loading failures, signing out user to clear inconsistent state');
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error signing out user:', signOutError);
        }
      }

      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Add a safety timeout to ensure loading state doesn't get stuck
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timed out, clearing state and setting loading to false');
        setSession(null);
        setUser(null);
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    const getInitialSession = async () => {
      try {
        console.log('Initializing auth session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setSession(null);
            setUser(null);
          }
          return;
        }

        if (mounted) {
          console.log('Session loaded:', session ? `Found session for ${session.user?.email}` : 'No session');

          if (session?.user) {
            try {
              console.log('Loading user profile for:', session.user.email);
              const userProfile = await loadUserProfile(session.user.id);

              if (userProfile) {
                setSession(session);
                setUser(userProfile);
                console.log('User profile loaded successfully');
              } else {
                console.warn('Failed to load user profile, clearing session');
                // Sign out if profile loading failed to avoid inconsistent state
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
              }
            } catch (profileError) {
              console.error('Error loading user profile:', profileError);
              // Clear state and sign out on profile loading error
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            }
          } else {
            setSession(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          console.log('Auth initialization complete, setting loading to false');
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.email);
        clearTimeout(timeoutId); // Clear timeout when auth state changes

        // Handle sign out events immediately
        if (event === 'SIGNED_OUT' || !session) {
          console.log('User signed out, clearing state');
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        setSession(session);

        if (session?.user) {
          try {
            const userProfile = await loadUserProfile(session.user.id);
            if (userProfile) {
              setUser(userProfile);
              console.log('User profile set successfully');
            } else {
              console.warn('Failed to load user profile, clearing session');
              // If profile loading failed, clear the session state
              setSession(null);
              setUser(null);
            }
          } catch (error) {
            console.error('Error in auth state change handler:', error);
            // Clear state on any error
            setSession(null);
            setUser(null);
          }
        } else {
          setUser(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with automatic password generation and email sending
  const signUp = async (userData: SignUpData): Promise<{ success: boolean; message: string; user?: SupabaseUser }> => {
    try {
      setIsLoading(true);

      // Generate a secure temporary password
      const temporaryPassword = generateSecurePassword();

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: temporaryPassword,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            company: userData.company,
            phone: userData.phone || null,
            company_size: userData.companySize || null,
            country_region: userData.countryRegion || null,
            industry: userData.industry || null,
            hear_about_us: userData.hearAboutUs || null,
            is_temporary_password: true, // Flag to indicate this is a temporary password
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Send welcome email with temporary credentials
        const emailResult = await sendWelcomeEmail(userData.email, userData.firstName, temporaryPassword);

        if (emailResult.success) {
          return {
            success: true,
            message: `Account created successfully! Your login credentials have been sent to ${userData.email}. Please check your email and use the temporary password to sign in.`,
            user: data.user
          };
        } else {
          // Account was created but email failed - still consider it a success but with a different message
          return {
            success: true,
            message: `Account created successfully! However, there was an issue sending your credentials via email. Please contact support. Temporary password: ${temporaryPassword}`,
            user: data.user
          };
        }
      }

      return { success: false, message: 'An unexpected error occurred during sign up.' };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    } finally {
      setIsLoading(false);
    }
  };


  // Sign in
  const signIn = async (email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);

        if (error.message.includes('Email not confirmed')) {
          return { success: false, message: 'Please check your email and click the verification link before signing in.' };
        }

        if (error.message.includes('Invalid login credentials')) {
          return { success: false, message: 'Invalid email or password. Please check your credentials.' };
        }

        return { success: false, message: `Authentication error: ${error.message}` };
      }

      if (data.user) {
        const userProfile = await loadUserProfile(data.user.id);
        if (userProfile) {
          setUser(userProfile);

          // Track login activity
          try {
            await DataService.userActivities.trackLogin(userProfile.id);
            // Initialize user data if first time
            const existingStats = await DataService.userUsageStats.getUserStats(userProfile.id);
            if (!existingStats) {
              await DataService.initializeNewUser(userProfile.id);
            }
          } catch (trackError) {
            console.error('Error tracking login:', trackError);
          }

          // Check if user has temporary password and needs to change it
          if (userProfile.hasTemporaryPassword) {
            return {
              success: true,
              message: 'Signed in successfully! You must change your temporary password before continuing.',
              user: userProfile
            };
          }

          return { success: true, message: 'Signed in successfully!', user: userProfile };
        }
      }

      return { success: false, message: 'An unexpected error occurred during sign in.' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Password reset email sent! Please check your inbox.' };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  };

  // Update password
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Password updated successfully!' };
    } catch (error: any) {
      console.error('Password update error:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  };

  // Change password from temporary to permanent
  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!user || !session) {
        return { success: false, message: 'You must be logged in to change your password.' };
      }

      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        console.error('Current password verification failed:', verifyError);
        return { success: false, message: 'Current password is incorrect.' };
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          is_temporary_password: false, // Mark as no longer temporary
        }
      });

      if (updateError) {
        console.error('Password change error:', updateError);
        return { success: false, message: updateError.message };
      }

      // Update local user state to reflect password change
      setUser(prev => prev ? { ...prev, hasTemporaryPassword: false } : null);

      return { success: true, message: 'Password changed successfully!' };
    } catch (error: any) {
      console.error('Password change error:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update user profile
  const updateUser = async (updates: Partial<User>): Promise<void> => {
    if (!user || !session) return;

    try {
      // Update the database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: updates.name ? updates.name.split(' ')[0] : undefined,
          last_name: updates.name ? updates.name.split(' ').slice(1).join(' ') : undefined,
          email: updates.email,
          company: updates.company,
          phone: updates.phone,
        })
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating user profile:', error);
        return;
      }

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);

      // Track profile update activity
      try {
        const updatedFields = Object.keys(updates);
        await DataService.userActivities.trackProfileUpdate(user.id, updatedFields);
      } catch (trackError) {
        console.error('Error tracking profile update:', trackError);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const value = {
    user,
    setUser,
    updateUser,
    isLoggedIn: !!user && !!session,
    logout,
    isLoading,
    session,
    signUp,
    signIn,
    resetPassword,
    updatePassword,
    changePassword,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// Helper functions
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendWelcomeEmail(email: string, firstName: string, temporaryPassword: string): Promise<{ success: boolean; message: string }> {
  const loginUrl = `${window.location.origin}/signin`;

  return await EmailService.sendWelcomeEmail({
    firstName,
    email,
    temporaryPassword,
    loginUrl
  });
}
