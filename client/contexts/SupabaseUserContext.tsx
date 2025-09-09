import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";
import { DataService } from "@/services/dataService";

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  role: "user" | "admin";
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
  const convertProfileToUser = (profile: UserProfile): User => {
    return {
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`,
      email: profile.email,
      company: profile.company,
      phone: profile.phone,
      role: profile.role as "user" | "admin",
      ...getDefaultUserData(profile),
    };
  };

  // Load user profile from database
  const loadUserProfile = async (authUserId: string): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return null;
      }

      return convertProfileToUser(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          return;
        }

        if (mounted) {
          setSession(session);
          
          if (session?.user) {
            const userProfile = await loadUserProfile(session.user.id);
            setUser(userProfile);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
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
        setSession(session);

        if (session?.user) {
          const userProfile = await loadUserProfile(session.user.id);
          setUser(userProfile);
        } else {
          setUser(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with automatic password generation and email sending
  const signUp = async (userData: SignUpData): Promise<{ success: boolean; message: string; user?: SupabaseUser }> => {
    try {
      setIsLoading(true);

      // Generate a secure password (this will be sent via email)
      const generatedPassword = generateSecurePassword();

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: generatedPassword,
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
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Send welcome email with credentials
        await sendWelcomeEmail(userData.email, userData.firstName, generatedPassword);
        
        return { 
          success: true, 
          message: `Account created successfully! Your login credentials have been sent to ${userData.email}`,
          user: data.user
        };
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

      // Enhanced mock users for testing purposes
      const mockUsers = {
        'mockuser@maigon.io': {
          password: 'MockPassword123!',
          user: {
            id: 'mock-user-id',
            name: 'Mock User',
            email: 'mockuser@maigon.io',
            company: 'Maigon Test',
            phone: '+1234567890',
            role: 'admin' as const,
          }
        },
        'arunendu.mazumder@maigon.io': {
          password: 'TestPassword123!',
          user: {
            id: 'arunendu-mock-id',
            name: 'Arunendu Mazumder',
            email: 'arunendu.mazumder@maigon.io',
            company: 'Maigon',
            phone: '+4748629416',
            role: 'admin' as const,
          }
        },
        'admin@maigon.io': {
          password: 'AdminTest123!',
          user: {
            id: 'admin-mock-id',
            name: 'Admin User',
            email: 'admin@maigon.io',
            company: 'Maigon',
            phone: '+1234567890',
            role: 'admin' as const,
          }
        }
      };

      const mockUserConfig = mockUsers[email as keyof typeof mockUsers];
      if (mockUserConfig && password === mockUserConfig.password) {
        const mockUser: User = {
          ...mockUserConfig.user,
          ...getDefaultUserData({
            id: mockUserConfig.user.id,
            email: mockUserConfig.user.email,
            first_name: mockUserConfig.user.name.split(' ')[0],
            last_name: mockUserConfig.user.name.split(' ').slice(1).join(' '),
            company: mockUserConfig.user.company,
            phone: mockUserConfig.user.phone,
            role: mockUserConfig.user.role,
          } as UserProfile),
        };

        console.log(`Mock user signed in: ${email}`);
        setUser(mockUser);
        return { success: true, message: `Mock user signed in successfully! (${email})`, user: mockUser };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);

        // Enhanced error handling for debugging
        if (error.message.includes('Email not confirmed')) {
          return { success: false, message: 'Please check your email and click the verification link before signing in.' };
        }

        if (error.message.includes('Invalid login credentials')) {
          // For development - provide more specific guidance
          if (email === 'arunendu.mazumder@maigon.io') {
            return {
              success: false,
              message: 'Authentication issue detected. Try using the mock user: mockuser@maigon.io with password: MockPassword123!'
            };
          }
          return { success: false, message: 'Invalid email or password. Try the mock user: mockuser@maigon.io' };
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

async function sendWelcomeEmail(email: string, firstName: string, password: string): Promise<void> {
  // For now, we'll log the credentials - in production, this would send an actual email
  console.log(`Welcome email would be sent to: ${email}`);
  console.log(`Login credentials for ${firstName}:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  
  // TODO: Implement actual email sending using a service like Resend, SendGrid, or AWS SES
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'noreply@maigon.io',
  //   to: email,
  //   subject: 'Welcome to Maigon - Your Account Credentials',
  //   html: generateWelcomeEmailHTML(firstName, email, password)
  // });
}
