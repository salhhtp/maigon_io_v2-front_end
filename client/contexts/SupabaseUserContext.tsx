import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";
import { DataService } from "@/services/dataService";
import { syncUserProfile } from "@/services/profileService";
import { EmailService } from "@/services/emailService";
import { OrganizationsService } from "@/services/organizationsService";
import { logError } from "@/utils/errorLogger";
import { useInactivityMonitor } from "@/utils/inactivityMonitor";
import { clearAuthData } from "@/utils/authCleanup";
import type {
  OrganizationQuotaConfig,
  OrganizationRole,
  UserAccessContext,
} from "@shared/api";
import { getPlanByKey } from "@shared/plans";

type AuthStatus =
  | "initializing"
  | "authenticating"
  | "authenticated"
  | "unauthenticated"
  | "error";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type UserActivityRow = Database["public"]["Tables"]["user_activities"]["Row"];
type UserUsageStatsRow =
  Database["public"]["Tables"]["user_usage_stats"]["Row"];

export interface User {
  id: string;
  profileId: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  role: "user" | "org_admin" | "admin";
  authUserId: string;
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
    type:
      | "free_trial"
      | "pay_as_you_go"
      | "monthly_10"
      | "monthly_15"
      | "professional";
    name: string;
    price: number;
    contracts_limit: number;
    contracts_used: number;
    billing_cycle: "trial" | "per_contract" | "monthly" | "custom";
    next_billing_date?: string;
    trial_days_remaining?: number;
    features: string[];
    payg?: {
      creditsBalance: number;
      creditsPurchased: number;
      creditsConsumed: number;
      updatedAt: string | null;
    };
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
  updateUser: (updates: Partial<User>) => Promise<void>;
  isLoggedIn: boolean;
  isLoading: boolean;
  authStatus: AuthStatus;
  lastError: string | null;
  session: Session | null;
  logout: () => Promise<void>;
  signUp: (
    userData: SignUpData,
  ) => Promise<{ success: boolean; message: string; user?: SupabaseUser }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string; user?: User }>;
  resetPassword: (
    email: string,
  ) => Promise<{ success: boolean; message: string }>;
  updatePassword: (
    newPassword: string,
  ) => Promise<{ success: boolean; message: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message: string }>;
  clearAuthState: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

const fallbackContext: UserContextType = {
  user: null,
  setUser: () => {
    console.warn(
      "useUser fallback context invoked. Ensure component tree is wrapped in UserProvider.",
    );
  },
  updateUser: async () => {
    console.warn("updateUser called on fallback context. No action performed.");
  },
  isLoggedIn: false,
  isLoading: false,
  authStatus: "unauthenticated",
  lastError: null,
  session: null,
  logout: async () => {
    console.warn("logout called on fallback context. No action performed.");
  },
  signUp: async () => {
    console.warn(
      "signUp called on fallback context. Returning failure response.",
    );
    return {
      success: false,
      message: "Authentication is currently unavailable. Please try again.",
    };
  },
  signIn: async () => {
    console.warn(
      "signIn called on fallback context. Returning failure response.",
    );
    return {
      success: false,
      message: "Authentication is currently unavailable. Please try again.",
    };
  },
  resetPassword: async () => {
    console.warn(
      "resetPassword called on fallback context. Returning failure response.",
    );
    return {
      success: false,
      message: "Password reset is unavailable outside authenticated context.",
    };
  },
  updatePassword: async () => {
    console.warn(
      "updatePassword called on fallback context. Returning failure response.",
    );
    return {
      success: false,
      message: "Password update is unavailable outside authenticated context.",
    };
  },
  changePassword: async () => {
    console.warn(
      "changePassword called on fallback context. Returning failure response.",
    );
    return {
      success: false,
      message: "Password change is unavailable outside authenticated context.",
    };
  },
  clearAuthState: async () => {
    console.warn(
      "clearAuthState called on fallback context. No action performed.",
    );
  },
  refreshUser: async () => {
    console.warn(
      "refreshUser called on fallback context. No action performed.",
    );
  },
};


const buildMonthlyUsage = (
  totalReviews: number,
): User["usage"]["monthly_usage"] => {
  const now = new Date();
  const months: User["usage"]["monthly_usage"] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = date.toLocaleString("en-US", { month: "short" });
    const isCurrentMonth = i === 0;

    months.push({
      month: label,
      reviews: isCurrentMonth ? totalReviews : 0,
      max: Math.max(5, totalReviews),
    });
  }

  return months;
};

const formatActivityAction = (activity: UserActivityRow): string => {
  if (activity.description) {
    return activity.description;
  }

  switch (activity.activity_type) {
    case "login":
      return "User logged in";
    case "contract_upload":
      return "Contract uploaded";
    case "review_completed":
      return "Review completed";
    case "export_data":
      return "Data exported";
    case "profile_update":
      return "Profile updated";
    case "contract_processing_error":
      return "Contract processing error";
    default:
      return activity.activity_type.replace(/_/g, " ");
  }
};

const extractActivityFile = (activity: UserActivityRow): string => {
  const metadata = (activity.metadata ?? null) as Record<
    string,
    unknown
  > | null;
  if (!metadata) {
    return activity.activity_type === "login" ? "Account" : "—";
  }

  if (
    typeof metadata.file_name === "string" &&
    metadata.file_name.trim().length > 0
  ) {
    return metadata.file_name;
  }

  if (
    typeof metadata.contract_title === "string" &&
    metadata.contract_title.trim().length > 0
  ) {
    return metadata.contract_title;
  }

  if (
    typeof metadata.contract_id === "string" &&
    metadata.contract_id.trim().length > 0
  ) {
    return `Contract ${metadata.contract_id}`;
  }

  if (
    typeof metadata.export_type === "string" &&
    metadata.export_type.trim().length > 0
  ) {
    return metadata.export_type;
  }

  return activity.activity_type === "login" ? "Account" : "—";
};

const mapActivitiesToTimeline = (
  activities: UserActivityRow[],
): User["recent_activity"] =>
  activities.map((activity) => ({
    action: formatActivityAction(activity),
    file: extractActivityFile(activity),
    time: new Date(activity.created_at ?? new Date()).toLocaleString(),
    status: activity.activity_type.includes("error") ? "failed" : "completed",
  }));

const deriveProfileDefaults = (
  authUser: SupabaseUser,
  overrides?: Partial<UserProfile>,
) => {
  const email = overrides?.email ?? authUser.email ?? "";
  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;

  const fromMetadata = (key: string) =>
    typeof metadata[key] === "string" &&
    (metadata[key] as string).trim().length > 0
      ? (metadata[key] as string)
      : undefined;

  const firstName =
    (overrides?.first_name ?? fromMetadata("first_name"))?.trim() ||
    (email ? email.split("@")[0] : "User");

  const lastName =
    (overrides?.last_name ?? fromMetadata("last_name"))?.trim() || "Account";

  const company =
    (overrides?.company ?? fromMetadata("company"))?.trim() ||
    "Unknown Company";

  return {
    email,
    first_name: firstName,
    last_name: lastName,
    company,
    phone: overrides?.phone ?? fromMetadata("phone") ?? null,
    company_size:
      overrides?.company_size ?? fromMetadata("company_size") ?? null,
    country_region:
      overrides?.country_region ?? fromMetadata("country_region") ?? null,
    industry: overrides?.industry ?? fromMetadata("industry") ?? null,
    hear_about_us:
      overrides?.hear_about_us ?? fromMetadata("hear_about_us") ?? null,
    role:
      (overrides?.role as "user" | "admin") ??
      (fromMetadata("role") === "admin" ? "admin" : "user"),
    is_active: overrides?.is_active ?? true,
  };
};

const ensureUserProfile = async (
  authUser: SupabaseUser,
  overrides?: Partial<UserProfile>,
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle<UserProfile>();

  if (error) {
    throw error;
  }

  if (data) {
    if (overrides) {
      const desired = deriveProfileDefaults(authUser, overrides);
      const diff: Partial<UserProfile> = {};

      (Object.keys(desired) as Array<keyof typeof desired>).forEach((key) => {
        const nextValue = desired[key];
        const currentValue = data[key as keyof UserProfile];

        if (
          nextValue !== undefined &&
          nextValue !== currentValue &&
          key in data
        ) {
          (diff as Record<string, unknown>)[key as keyof UserProfile] =
            nextValue as unknown;
        }
      });

      if (Object.keys(diff).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from("user_profiles")
          .update(diff)
          .eq("id", data.id)
          .select("*")
          .single<UserProfile>();

        if (updateError) {
          throw updateError;
        }

        return updated;
      }
    }

    return data;
  }

  const payload = {
    ...deriveProfileDefaults(authUser, overrides),
    auth_user_id: authUser.id,
    id: authUser.id,
  };

  const { data: created, error: createError } = await supabase
    .from("user_profiles")
    .insert(payload)
    .select("*")
    .single<UserProfile>();

  if (createError) {
    throw createError;
  }

  return created;
};

const buildUser = (
  profile: UserProfile,
  authUser: SupabaseUser | null,
  stats?: UserUsageStatsRow | null,
  activities?: UserActivityRow[] | null,
  access?: UserAccessContext | null,
  planRow?: UserPlanRow | null,
  paygBalance?: UserPaygBalanceRow | null,
): User => {
  const profileRole: User["role"] =
    profile.role === "admin" ? "admin" : "user";
  const derivedRole: User["role"] = access?.isMaigonAdmin
    ? "admin"
    : access?.organizationRole === "org_admin"
      ? "org_admin"
      : profileRole;

  const organizationDetails: User["organization"] = access?.organization
    ? {
        id: access.organization.id,
        name: access.organization.name,
        slug: access.organization.slug,
        billingPlan: access.organization.billingPlan,
        role: access.organizationRole ?? null,
        quotas: access.quotas,
      }
    : null;

  const displayName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`
    .trim()
    .replace(/\s+/g, " ");

  const base: User = {
    id: profile.id,
    profileId: profile.id,
    name: displayName || profile.email,
    email: profile.email,
    company: profile.company,
    phone: profile.phone,
    role: derivedRole,
    authUserId: authUser?.id ?? profile.auth_user_id ?? "",
    hasTemporaryPassword:
      authUser?.user_metadata?.is_temporary_password === true,
    isOrgAdmin: derivedRole === "org_admin",
    isMaigonAdmin: access?.isMaigonAdmin ?? profileRole === "admin",
    organization: organizationDetails,
    access: access ?? null,
    ...getDefaultUserData(profile, access),
  };

  if (planRow) {
    const planKey = (planRow.plan_type as User["plan"]["type"]) ?? base.plan.type;
    const planDefinition = getPlanByKey(planKey);
    let extractedFeatures: string[] | undefined;

    if (Array.isArray(planRow.features)) {
      extractedFeatures = (planRow.features as unknown[]).map((feature) =>
        String(feature),
      );
    } else if (typeof planRow.features === "string") {
      try {
        const parsed = JSON.parse(planRow.features);
        if (Array.isArray(parsed)) {
          extractedFeatures = parsed.map((feature) => String(feature));
        }
      } catch (error) {
        logError("Failed to parse plan feature list", error, {
          profileId: profile.id,
        });
      }
    }

    if (!extractedFeatures) {
      extractedFeatures = planDefinition?.features ?? base.plan.features;
    }

    base.plan = {
      ...base.plan,
      type: planKey,
      name:
        planRow.plan_name ?? planDefinition?.name ?? base.plan.name,
      price:
        typeof planRow.price === "number"
          ? planRow.price
          : planDefinition?.price ?? base.plan.price,
      contracts_limit:
        typeof planRow.contracts_limit === "number"
          ? planRow.contracts_limit
          : planDefinition?.quotas.contractsLimit ?? base.plan.contracts_limit,
      contracts_used:
        typeof planRow.contracts_used === "number"
          ? planRow.contracts_used
          : base.plan.contracts_used,
      billing_cycle:
        (planRow.billing_cycle as User["plan"]["billing_cycle"]) ??
        planDefinition?.billingCycle ??
        base.plan.billing_cycle,
      next_billing_date:
        planRow.next_billing_date ?? base.plan.next_billing_date,
      trial_days_remaining:
        typeof planRow.trial_days_remaining === "number"
          ? planRow.trial_days_remaining
          : base.plan.trial_days_remaining,
      features: extractedFeatures,
      payg:
        planDefinition?.payg || planKey === "pay_as_you_go"
          ? {
              creditsBalance: paygBalance?.credits_balance ?? 0,
              creditsPurchased: paygBalance?.credits_purchased ?? 0,
              creditsConsumed: paygBalance?.credits_consumed ?? 0,
              updatedAt: paygBalance?.updated_at ?? null,
            }
          : undefined,
    };
  } else if (base.isMaigonAdmin) {
    const enterprise = getPlanByKey("professional");
    if (enterprise) {
      base.plan = {
        ...base.plan,
        type: "professional",
        name: enterprise.name,
        price: enterprise.price,
        contracts_limit: enterprise.quotas.contractsLimit,
        billing_cycle: enterprise.billingCycle,
        features: enterprise.features,
        trial_days_remaining: undefined,
        payg: undefined,
      };
    }
  }

  if (stats) {
    base.usage = {
      total_reviews: stats.contracts_reviewed ?? 0,
      this_month_reviews: stats.contracts_reviewed ?? 0,
      success_rate:
        stats.contracts_reviewed === 0 ? 100 : base.usage.success_rate,
      monthly_usage: buildMonthlyUsage(stats.contracts_reviewed ?? 0),
    };
  } else {
    base.usage.monthly_usage = buildMonthlyUsage(base.usage.total_reviews);
  }

  if (activities && activities.length > 0) {
    base.recent_activity = mapActivitiesToTimeline(activities);
  }

  return base;
};

type UserPlanRow = {
  plan_type: string | null;
  plan_name: string | null;
  price: number | null;
  contracts_limit: number | null;
  contracts_used: number | null;
  billing_cycle: string | null;
  features: unknown;
  next_billing_date: string | null;
  trial_days_remaining: number | null;
};

type UserPaygBalanceRow = {
  credits_balance: number | null;
  credits_purchased: number | null;
  credits_consumed: number | null;
  updated_at: string | null;
};

const composeUser = async (
  authUser: SupabaseUser,
  profile: UserProfile,
): Promise<User> => {
  const [
    statsResult,
    activitiesResult,
    planResult,
    paygResult,
  ] = await Promise.allSettled([
    DataService.userUsageStats.getUserStats(profile.id),
    DataService.userActivities.getRecentActivities(profile.id, 5),
    supabase
      .from("user_plans")
      .select(
        "plan_type, plan_name, price, contracts_limit, contracts_used, billing_cycle, features, next_billing_date, trial_days_remaining",
      )
      .eq("user_id", profile.id)
      .maybeSingle<UserPlanRow>(),
    supabase
      .from("user_payg_balances")
      .select("credits_balance, credits_purchased, credits_consumed, updated_at")
      .eq("user_id", profile.id)
      .maybeSingle<UserPaygBalanceRow>(),
  ]);

  let stats: UserUsageStatsRow | null = null;
  if (statsResult.status === "fulfilled" && statsResult.value) {
    stats = statsResult.value as UserUsageStatsRow;
  } else if (statsResult.status === "rejected") {
    logError("Failed to load user usage stats", statsResult.reason, {
      profileId: profile.id,
    });
  }

  let activities: UserActivityRow[] | null = null;
  if (activitiesResult.status === "fulfilled" && activitiesResult.value) {
    activities = activitiesResult.value as UserActivityRow[];
  } else if (activitiesResult.status === "rejected") {
    logError("Failed to load user activity timeline", activitiesResult.reason, {
      profileId: profile.id,
    });
  }

  let access: UserAccessContext | null = null;
  let resolvedProfile: UserProfile = profile;
  let plan: UserPlanRow | null = null;

  try {
    const profileAccess = await OrganizationsService.getProfileWithAccess(
      authUser.id,
    );

    if (profileAccess) {
      access = profileAccess.access;
      resolvedProfile = profileAccess.profile as UserProfile;
    }
  } catch (error) {
    logError("Failed to resolve organization access context", error, {
      profileId: profile.id,
      authUserId: authUser.id,
    });
  }

  if (planResult.status === "fulfilled") {
    const { data, error } = planResult.value;
    if (error) {
      logError("Failed to load user plan", error, {
        profileId: profile.id,
      });
    } else {
      plan = data;
    }
  } else {
    logError("Failed to load user plan", planResult.reason, {
      profileId: profile.id,
    });
  }

  let paygBalance: UserPaygBalanceRow | null = null;
  if (paygResult.status === "fulfilled" && paygResult.value) {
    const { data, error } = paygResult.value;
    if (error) {
      logError("Failed to load PAYG balance", error, {
        profileId: profile.id,
      });
    } else {
      paygBalance = data;
    }
  } else if (paygResult.status === "rejected") {
    logError("Failed to load PAYG balance", paygResult.reason, {
      profileId: profile.id,
    });
  }

  return buildUser(
    resolvedProfile,
    authUser,
    stats,
    activities,
    access,
    plan,
    paygBalance,
  );
};

const mapSupabaseAuthError = (message: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password. Please check your credentials.";
  }

  if (normalized.includes("over email rate limit")) {
    return "Too many login attempts. Please try again later.";
  }

  return message;
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing");
  const [lastError, setLastError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const setUser = useCallback((value: User | null) => {
    if (!isMountedRef.current) return;
    setUserState(value);
  }, []);

  const handleSessionChange = useCallback(
    async (
      incomingSession: Session | null,
      options: { suppressLoadingState?: boolean } = {},
    ) => {
      if (!isMountedRef.current) {
        return null;
      }

      if (!incomingSession?.user) {
        setSession(null);
        setUserState(null);
        setAuthStatus("unauthenticated");
        setLastError(null);
        return null;
      }

      setSession(incomingSession);

      if (!options.suppressLoadingState) {
        setAuthStatus((prev) =>
          prev === "initializing" ? prev : "authenticating",
        );
      }

      try {
        const profile = await ensureUserProfile(incomingSession.user);
        try {
          await syncUserProfile({
            profileId: profile.id,
            authUserId: incomingSession.user.id,
            email: profile.email,
            firstName: profile.first_name || undefined,
            lastName: profile.last_name || undefined,
            company: profile.company || undefined,
          });
        } catch (syncError) {
          logError("Failed to sync profile with server", syncError, {
            profileId: profile.id,
            authUserId: incomingSession.user.id,
          });
        }
        const hydratedUser = await composeUser(incomingSession.user, profile);

        if (!isMountedRef.current) {
          return hydratedUser;
        }

        setUserState(hydratedUser);
        setAuthStatus("authenticated");
        setLastError(null);
        return hydratedUser;
      } catch (error) {
        const details = logError(
          "Failed to hydrate authenticated user",
          error,
          {
            authUserId: incomingSession.user.id,
          },
        );

        if (isMountedRef.current) {
          setUserState(null);
          setAuthStatus("error");
          setLastError(details.message);
        }

        throw new Error(details.message ?? "Failed to load your account.");
      }
    },
    [],
  );

  useEffect(() => {
    const bootstrap = async () => {
      setAuthStatus("initializing");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          const details = logError(
            "Failed to retrieve Supabase session",
            error,
          );
          if (!isMountedRef.current) return;
          setSession(null);
          setUserState(null);
          setAuthStatus("error");
          setLastError(details.message);
          return;
        }

        try {
          const hydratedUser = await handleSessionChange(data.session ?? null, {
            suppressLoadingState: true,
          });

          if (!isMountedRef.current) return;

          if (!hydratedUser) {
            setAuthStatus("unauthenticated");
          }
        } catch (hydrateError) {
          if (!isMountedRef.current) return;
          setAuthStatus("error");
          setLastError(
            hydrateError instanceof Error
              ? hydrateError.message
              : "Unable to load your account. Please try again.",
          );
        }
      } catch (error) {
        const details = logError("Auth initialization error", error);
        if (!isMountedRef.current) return;

        setSession(null);
        setUserState(null);
        setAuthStatus("error");
        setLastError(details.message);
      }
    };

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!isMountedRef.current) return;

        switch (event) {
          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
          case "USER_UPDATED":
            void handleSessionChange(nextSession ?? null);
            break;
          case "SIGNED_OUT":
            clearAuthData();
            setLastError(null);
            setUserState(null);
            setSession(null);
            setAuthStatus("unauthenticated");
            break;
          default:
            break;
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [handleSessionChange]);

  const signUp = useCallback(
    async (
      userData: SignUpData,
    ): Promise<{ success: boolean; message: string; user?: SupabaseUser }> => {
      setAuthStatus("authenticating");
      setLastError(null);

      try {
        const temporaryPassword = EmailService.generateTemporaryPassword();

        const { data, error } = await supabase.auth.signUp({
          email: userData.email,
          password: temporaryPassword,
          options: {
            data: {
              first_name: userData.firstName,
              last_name: userData.lastName,
              company: userData.company,
              phone: userData.phone ?? null,
              company_size: userData.companySize ?? null,
              country_region: userData.countryRegion ?? null,
              industry: userData.industry ?? null,
              hear_about_us: userData.hearAboutUs ?? null,
              is_temporary_password: true,
            },
          },
        });

        if (error) {
          const message = mapSupabaseAuthError(error.message);
          setAuthStatus("unauthenticated");
          return { success: false, message };
        }

        if (data.user) {
          try {
            await ensureUserProfile(data.user, {
              email: userData.email,
              first_name: userData.firstName,
              last_name: userData.lastName,
              company: userData.company,
              phone: userData.phone ?? null,
              company_size: userData.companySize ?? null,
              country_region: userData.countryRegion ?? null,
              industry: userData.industry ?? null,
              hear_about_us: userData.hearAboutUs ?? null,
            });
          } catch (profileError) {
            logError(
              "Unable to provision user profile during signup",
              profileError,
              {
                email: userData.email,
              },
            );
          }

          let message = `Account created successfully! Your login credentials have been sent to ${userData.email}.`;

          if (typeof window !== "undefined") {
            const emailResult = await EmailService.sendWelcomeEmail({
              firstName: userData.firstName,
              email: userData.email,
              temporaryPassword,
              loginUrl: `${window.location.origin}/signin`,
            });

            if (!emailResult.success) {
              message = `${emailResult.message} Temporary password: ${temporaryPassword}`;
            }
          }

          setAuthStatus("unauthenticated");
          return { success: true, message, user: data.user };
        }

        setAuthStatus("unauthenticated");
        return {
          success: false,
          message: "An unexpected error occurred during sign up.",
        };
      } catch (error) {
        const details = logError("Sign up error", error, {
          email: userData.email,
        });
        setAuthStatus("error");
        setLastError(details.message);
        return {
          success: false,
          message: details.message ?? "An unexpected error occurred.",
        };
      }
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setAuthStatus("authenticating");
      setLastError(null);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const message = mapSupabaseAuthError(error.message);
          setAuthStatus("unauthenticated");
          return { success: false, message };
        }

        if (!data.session || !data.user) {
          setAuthStatus("unauthenticated");
          return {
            success: false,
            message: "Sign-in failed. Please try again.",
          };
        }

        let hydratedUser: User | null = null;

        try {
          hydratedUser = await handleSessionChange(data.session);
        } catch (hydrateError) {
          const message =
            hydrateError instanceof Error
              ? hydrateError.message
              : "Unable to load your account. Please try again.";
          return { success: false, message };
        }

        if (!hydratedUser) {
          setAuthStatus("error");
          return {
            success: false,
            message: "Unable to load your account. Please try again.",
          };
        }

        try {
          await DataService.userActivities.trackLogin(hydratedUser.id);
        } catch (activityError) {
          logError("Failed to track login activity", activityError, {
            userId: hydratedUser.id,
          });
        }

        if (hydratedUser.hasTemporaryPassword) {
          return {
            success: true,
            message:
              "Signed in successfully! Please change your temporary password before continuing.",
            user: hydratedUser,
          };
        }

        return {
          success: true,
          message: "Signed in successfully!",
          user: hydratedUser,
        };
      } catch (error) {
        const details = logError("Sign in error", error, { email });
        setAuthStatus("error");
        setLastError(details.message);
        return {
          success: false,
          message:
            details.message ?? "An unexpected error occurred during sign in.",
        };
      }
    },
    [handleSessionChange],
  );

  const logout = useCallback(async () => {
    setAuthStatus("authenticating");
    setLastError(null);

    try {
      const { error: globalError } = await supabase.auth.signOut({
        scope: "global",
      });
      if (globalError) {
        logError("Global sign out error", globalError);
      }
    } catch (error) {
      logError("Global sign out exception", error);
    }

    try {
      const { error: localError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (localError) {
        logError("Local sign out error", localError);
      }
    } catch (error) {
      logError("Local sign out exception", error);
    }

    clearAuthData();

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("maigon:lastReview");
    }

    if (isMountedRef.current) {
      setSession(null);
      setUserState(null);
      setAuthStatus("unauthenticated");
      setLastError(null);
    }

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("maigon:postLogoutRedirect", "true");
      } catch (storageError) {
        console.warn("Unable to set logout redirect flag", storageError);
      }
      window.location.replace("/signin");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session?.user) return;

    try {
      await handleSessionChange(session, { suppressLoadingState: false });
    } catch (error) {
      logError("Refresh user error", error, { userId: session.user.id });
    }
  }, [handleSessionChange, session]);

  useInactivityMonitor(
    5 * 60 * 1000,
    () => {
      console.log("⏰ User inactive for 5 minutes - auto logout");
      void logout();
    },
    authStatus === "authenticated",
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      });

      if (error) {
        return { success: false, message: mapSupabaseAuthError(error.message) };
      }

      return {
        success: true,
        message: "Password reset email sent! Please check your inbox.",
      };
    } catch (error) {
      const details = logError("Password reset error", error, { email });
      return {
        success: false,
        message: details.message ?? "An unexpected error occurred.",
      };
    }
  }, []);

  const updatePassword = useCallback(
    async (newPassword: string) => {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          return {
            success: false,
            message: mapSupabaseAuthError(error.message),
          };
        }

        await refreshUser();
        return { success: true, message: "Password updated successfully!" };
      } catch (error) {
        const details = logError("Password update error", error);
        return {
          success: false,
          message: details.message ?? "An unexpected error occurred.",
        };
      }
    },
    [refreshUser],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!session?.user?.email) {
        return {
          success: false,
          message: "You must be logged in to change your password.",
        };
      }

      try {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: currentPassword,
        });

        if (verifyError) {
          return {
            success: false,
            message: "Current password is incorrect.",
          };
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
          data: {
            is_temporary_password: false,
          },
        });

        if (updateError) {
          return {
            success: false,
            message: mapSupabaseAuthError(updateError.message),
          };
        }

        await refreshUser();
        return { success: true, message: "Password changed successfully!" };
      } catch (error) {
        const details = logError("Password change error", error);
        return {
          success: false,
          message: details.message ?? "An unexpected error occurred.",
        };
      }
    },
    [refreshUser, session?.user?.email],
  );

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) return;

      const nextName = updates.name ?? user.name;
      const [firstName, ...rest] = nextName.trim().split(/\s+/);
      const lastName =
        rest.join(" ") ||
        user.name.trim().split(/\s+/).slice(1).join(" ") ||
        "Account";

      const payload = {
        first_name: firstName || user.name.split(" ")[0] || "User",
        last_name: lastName,
        email: updates.email ?? user.email,
        company: updates.company ?? user.company,
        phone: updates.phone ?? user.phone,
      };

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .update(payload)
          .eq("id", user.id)
          .select("*")
          .single<UserProfile>();

        if (error) {
          throw error;
        }

        if (!isMountedRef.current) return;

        setUserState((prev) =>
          prev
            ? {
                ...prev,
                name: `${data.first_name} ${data.last_name}`.trim(),
                email: data.email,
                company: data.company,
                phone: data.phone,
              }
            : prev,
        );
      } catch (error) {
        const details = logError("Error updating user profile", error, {
          userId: user.id,
        });
        throw new Error(details.message ?? "Failed to update profile.");
      }
    },
    [user],
  );

  const clearAuthState = useCallback(async () => {
    console.log("🧹 [DEBUG] Manually clearing auth state...");
    try {
      await supabase.auth.signOut({ scope: "global" });
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      logError("[DEBUG] Error clearing auth state", error);
    } finally {
      clearAuthData();
      if (isMountedRef.current) {
        setSession(null);
        setUserState(null);
        setAuthStatus("unauthenticated");
        setLastError(null);
      }
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      setUser,
      updateUser,
      isLoggedIn: authStatus === "authenticated" && !!user && !!session,
      isLoading:
        authStatus === "initializing" || authStatus === "authenticating",
      authStatus,
      lastError,
      session,
      logout,
      signUp,
      signIn,
      resetPassword,
      updatePassword,
      changePassword,
      clearAuthState,
      refreshUser,
    }),
    [
      user,
      setUser,
      updateUser,
      authStatus,
      lastError,
      session,
      logout,
      signUp,
      signIn,
      resetPassword,
      updatePassword,
      changePassword,
      clearAuthState,
      refreshUser,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    console.warn(
      "useUser accessed outside of UserProvider. Returning fallback unauthenticated context.",
    );
    return fallbackContext;
  }
  return context;
};
const getDefaultUserData = (
  profile: UserProfile,
  access?: UserAccessContext | null,
): Omit<
  User,
  | "id"
  | "name"
  | "email"
  | "company"
  | "phone"
  | "role"
  | "profileId"
  | "authUserId"
  | "hasTemporaryPassword"
  | "isOrgAdmin"
  | "isMaigonAdmin"
  | "organization"
  | "access"
> => {
  const hasOrganization = Boolean(access?.organization);
  const isMaigonAdmin = access?.isMaigonAdmin ?? false;
  const contractsLimit =
    typeof access?.quotas?.contractsLimit === "number"
      ? access?.quotas?.contractsLimit || (hasOrganization ? 10 : 5)
      : hasOrganization
        ? 10
        : 5;
  const planType =
    hasOrganization || isMaigonAdmin ? "professional" : "free_trial";

  const planName = hasOrganization
    ? `${access?.organization?.name ?? "Organization"} Plan`
    : isMaigonAdmin
      ? "Enterprise Plan"
      : "Free Trial";

  const planFeatures =
    hasOrganization || isMaigonAdmin
      ? [
          "Organization-wide analytics dashboard",
          "Role-based access controls",
          "Priority support and onboarding",
          "Team usage reporting",
        ]
      : [
          "Review up to 5 agreements in 14 days",
          "Full compliance report with risk assessment",
          "Clause extraction and recommendations",
          "Access to all 7 contract modules",
          "Report storage for 7 days",
        ];

  const usageMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map(
    (month) => ({
      month,
      reviews: 0,
      max: contractsLimit,
    }),
  );

  return {
    plan: {
      type: planType,
      name: planName,
      price: hasOrganization || isMaigonAdmin ? 0 : 0,
      contracts_limit: contractsLimit,
      contracts_used: 0,
      billing_cycle: hasOrganization || isMaigonAdmin ? "monthly" : "trial",
      trial_days_remaining: hasOrganization || isMaigonAdmin ? undefined : 14,
      features: planFeatures,
    },
    usage: {
      total_reviews: 0,
      this_month_reviews: 0,
      success_rate: 100,
      monthly_usage: usageMonths,
    },
    billing: {
      current_bill: 0,
      payment_method:
        hasOrganization || isMaigonAdmin ? "Invoice" : "No payment method",
      billing_history: [],
    },
    recent_activity: [
      {
        action: "Account created",
        file: profile.company || "Account",
        time: new Date(profile.created_at ?? new Date()).toLocaleString(),
        status: "completed",
      },
    ],
    settings: {
      email_notifications: true,
      push_notifications: false,
      marketing_emails: true,
      two_factor_auth: false,
      auto_save: true,
      language: profile.country_region ?? "en",
      timezone: "UTC",
    },
  };
};
