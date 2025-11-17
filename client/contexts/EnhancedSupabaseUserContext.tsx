import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";
import { EmailService } from "@/services/emailService";
import { DataService } from "@/services/dataService";
import { OrganizationsService } from "@/services/organizationsService";
import logger from "@/utils/logger";
import { errorHandler, handleAsync, createAuthError } from "@/utils/errorHandler";
import { performanceMonitor } from "@/utils/performance";
import type {
  OrganizationQuotaConfig,
  OrganizationRole,
  UserAccessContext,
} from "@shared/api";

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  role: "user" | "org_admin" | "admin";
  hasTemporaryPassword?: boolean;
  isOrgAdmin: boolean;
  isMaigonAdmin: boolean;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    billingPlan: string;
    role: OrganizationRole | null;
    quotas: OrganizationQuotaConfig | null;
  } | null;
  access: UserAccessContext | null;
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
    status: "completed" | "in_progress" | "failed";
  }>;
}

interface SupabaseUserContextType {
  user: User | null;
  authUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, firstName: string, lastName: string, company?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const SupabaseUserContext = createContext<SupabaseUserContextType | undefined>(undefined);

export function SupabaseUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Set user ID in logger when user changes
  useEffect(() => {
    logger.setUserId(user?.id || null);
  }, [user?.id]);

  // Generate secure password
  const generateSecurePassword = (): string => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    // Ensure at least one character from each required type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // Uppercase
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // Lowercase  
    password += "0123456789"[Math.floor(Math.random() * 10)]; // Number
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // Special char
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Enhanced sign up with error handling
  const signUp = async (
    email: string, 
    firstName: string, 
    lastName: string, 
    company?: string, 
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    
    const { data, error } = await handleAsync(async () => {
      return performanceMonitor.measureAsync('auth:signup', async () => {
        logger.authInfo('Sign up attempt started', { email, company });

        const temporaryPassword = generateSecurePassword();
        const fullName = `${firstName} ${lastName}`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password: temporaryPassword,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
              company: company || '',
              phone: phone || '',
              is_temporary_password: true,
            },
          },
        });

        if (error) {
          logger.authError('Sign up failed', { email, error: error.message });
          throw error;
        }

        if (!data.user) {
          throw new Error('No user returned from sign up');
        }

        // Send welcome email with credentials
        try {
          const userData = {
            id: data.user.id,
            email,
            firstName,
            lastName,
            fullName,
            company: company || '',
            phone: phone || '',
          };

          await EmailService.sendWelcomeEmail(email, firstName, temporaryPassword);
          logger.emailAction('Welcome email sent', email, { userId: data.user.id });
        } catch (emailError) {
          logger.error('Failed to send welcome email', { email, error: emailError });
          // Don't fail the signup for email issues
        }

        logger.authInfo('Sign up completed successfully', { 
          email, 
          userId: data.user.id,
          hasTemporaryPassword: true 
        });

        return data;
      });
    }, { email, action: 'signup' });

    if (error) {
      return { success: false, error: error.userMessage };
    }

    return { success: true };
  };

  // Enhanced sign in with error handling
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await handleAsync(async () => {
      return performanceMonitor.measureAsync('auth:signin', async () => {
        logger.authInfo('Sign in attempt started', { email });

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          logger.authError('Sign in failed', { email, error: error.message });
          throw error;
        }

        if (!data.user) {
          throw new Error('No user returned from sign in');
        }

        logger.authInfo('Sign in completed successfully', { 
          email, 
          userId: data.user.id 
        });

        return data;
      });
    }, { email, action: 'signin' });

    if (error) {
      return { success: false, error: error.userMessage };
    }

    return { success: true };
  };

  // Enhanced sign out with error handling
  const signOut = async (): Promise<void> => {
    await errorHandler.handleAsync(
      async () => {
        return performanceMonitor.measureAsync('auth:signout', async () => {
          const userId = user?.id;
          logger.authInfo('Sign out started', { userId });

          const { error } = await supabase.auth.signOut();
          
          if (error) {
            logger.authError('Sign out failed', { userId, error: error.message });
            throw error;
          }

          // Clear user state
          setUser(null);
          setAuthUser(null);
          setSession(null);

          logger.authInfo('Sign out completed successfully', { userId });
        });
      },
      { action: 'signout' },
      { showUserError: false },
    );
  };

  // Enhanced change password with error handling
  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await handleAsync(async () => {
      return performanceMonitor.measureAsync('auth:change-password', async () => {
        logger.authInfo('Password change started', { userId: user?.id });

        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
          data: { is_temporary_password: false },
        });

        if (error) {
          logger.authError('Password change failed', { userId: user?.id, error: error.message });
          throw error;
        }

        // Update user profile to remove temporary password flag
        if (authUser) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', authUser.id);

          if (profileError) {
            logger.warn('Failed to update profile after password change', { 
              userId: authUser.id, 
              error: profileError.message 
            });
          }
        }

        logger.authInfo('Password change completed successfully', { userId: user?.id });
        return data;
      });
    }, { action: 'change-password' });

    if (error) {
      return { success: false, error: error.userMessage };
    }

    // Refresh user data to clear temporary password flag
    await refreshUser();
    return { success: true };
  };

  // Enhanced reset password with error handling
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await handleAsync(async () => {
      return performanceMonitor.measureAsync('auth:reset-password', async () => {
        logger.authInfo('Password reset started', { email });

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          logger.authError('Password reset failed', { email, error: error.message });
          throw error;
        }

        logger.authInfo('Password reset email sent', { email });
        return data;
      });
    }, { email, action: 'reset-password' });

    if (error) {
      return { success: false, error: error.userMessage };
    }

    return { success: true };
  };

  // Enhanced load user profile with error handling
  const loadUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    const { data: profileAccess, error } = await errorHandler.handleAsync(
      async () => {
        return performanceMonitor.measureAsync("auth:load-profile", async () => {
          logger.debug("Loading user profile", { userId: authUser.id });

          const result = await OrganizationsService.getProfileWithAccess(
            authUser.id,
          );

          if (!result) {
            logger.error("Failed to load user profile context", {
              userId: authUser.id,
            });
            throw new Error("User profile not found");
          }

          logger.debug("User profile loaded successfully", {
            userId: authUser.id,
            organizationId: result.access.organizationId,
            organizationRole: result.access.organizationRole,
          });

          return result;
        });
      },
      { userId: authUser.id, action: "load-profile" },
      { showUserError: false },
    );

    if (error || !profileAccess) {
      return null;
    }

    const { profile: userProfile, access, organization } = profileAccess;
    const profileFields = userProfile as Record<string, unknown>;

    const hasTemporaryPassword =
      authUser.user_metadata?.is_temporary_password === true;

    const derivedRole = access.isMaigonAdmin
      ? "admin"
      : access.organizationRole === "org_admin"
        ? "org_admin"
        : "user";

    const organizationDetails = organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          billingPlan: organization.billingPlan,
          role: access.organizationRole,
          quotas: access.quotas,
        }
      : null;

    const planContractsLimit =
      organizationDetails?.quotas?.contractsLimit ??
      (organizationDetails ? 10 : 5);

    const fullName =
      typeof profileFields.full_name === "string" &&
      profileFields.full_name.trim().length > 0
        ? (profileFields.full_name as string)
        : `${userProfile.first_name ?? ""} ${userProfile.last_name ?? ""}`
            .trim() || authUser.email || authUser.id;

    const mockUser: User = {
      id: userProfile.id || authUser.id,
      name: fullName,
      email: authUser.email ?? "",
      company: userProfile.company || "",
      phone: userProfile.phone,
      role: derivedRole,
      hasTemporaryPassword,
      isOrgAdmin: derivedRole === "org_admin",
      isMaigonAdmin: access.isMaigonAdmin,
      organization: organizationDetails,
      access,
      plan: {
        type: organizationDetails ? "professional" : "free_trial",
        name: organizationDetails
          ? `${organizationDetails.billingPlan} Plan`
          : access?.isMaigonAdmin
            ? "Enterprise Plan"
            : "Free Trial",
        price: organizationDetails ? 499 : 0,
        contracts_limit: planContractsLimit,
        contracts_used: 0,
        billing_cycle: organizationDetails ? "monthly" : "trial",
        next_billing_date: organizationDetails ? new Date().toISOString() : undefined,
        trial_days_remaining: organizationDetails ? undefined : 14,
        features: organizationDetails
          ? [
              "Unlimited contract reviews",
              "Dedicated account manager",
              "Custom integrations & API access",
              "Advanced analytics & reporting",
            ]
          : [
              "Review up to 5 agreements in 14 days",
              "Full compliance report with risk assessment",
              "Clause extraction and recommendations",
              "Report storage for 7 days",
            ],
      },
      usage: {
        total_reviews: 0,
        this_month_reviews: 0,
        success_rate: 0,
        monthly_usage: [],
      },
      billing: {
        current_bill: organizationDetails ? 499 : 0,
        payment_method: organizationDetails ? "Invoice" : "No payment method",
        billing_history: [],
      },
      recent_activity: [],
    };

    return mockUser;
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (authUser) {
      const userProfile = await loadUserProfile(authUser);
      setUser(userProfile);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        logger.debug('Initializing auth state');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Failed to get session', { error: error.message });
          return;
        }

        setSession(session);
        
        if (session?.user) {
          setAuthUser(session.user);
          const userProfile = await loadUserProfile(session.user);
          setUser(userProfile);
        }
        
        logger.debug('Auth state initialized', { hasSession: !!session, hasUser: !!session?.user });
      } catch (error) {
        logger.error('Auth initialization failed', { error });
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.authInfo('Auth state changed', { event, hasSession: !!session });
        
        setSession(session);
        
        if (session?.user) {
          setAuthUser(session.user);
          const userProfile = await loadUserProfile(session.user);
          setUser(userProfile);
        } else {
          setAuthUser(null);
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: SupabaseUserContextType = {
    user,
    authUser,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    changePassword,
    resetPassword,
    refreshUser,
  };

  return (
    <SupabaseUserContext.Provider value={value}>
      {children}
    </SupabaseUserContext.Provider>
  );
}

export function useSupabaseUser() {
  const context = useContext(SupabaseUserContext);
  if (context === undefined) {
    throw new Error('useSupabaseUser must be used within a SupabaseUserProvider');
  }
  return context;
}

// Export for backward compatibility
export { SupabaseUserProvider as UserProvider, useSupabaseUser as useUser };
