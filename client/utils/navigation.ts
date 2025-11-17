import type { User } from "@/contexts/SupabaseUserContext";

/**
 * Resolve the default landing route for an authenticated user based on role.
 */
export const getDefaultDashboardRoute = (user: User | null | undefined): string => {
  if (!user) {
    return "/signin";
  }

  if (user.isMaigonAdmin) {
    return "/dashboard";
  }

  if (user.isOrgAdmin && user.organization?.id) {
    return "/org-admin";
  }

  return "/user-dashboard";
};
