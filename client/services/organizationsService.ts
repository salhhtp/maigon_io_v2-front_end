import { supabase, type Database } from "@/lib/supabase";
import logger from "@/utils/logger";
import {
  buildUserAccessContext,
  createOrganizationSummaryFromRow,
  type OrganizationSummary,
  type UserAccessContext,
} from "@shared/api";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

type UserProfileWithOrganization = UserProfileRow & {
  organizations?: OrganizationRow | OrganizationRow[] | null;
};

export interface ProfileAccessResult {
  profile: UserProfileRow;
  organization: OrganizationSummary | null;
  access: UserAccessContext;
}

export class OrganizationsService {
  static async getProfileWithAccess(
    authUserId: string,
  ): Promise<ProfileAccessResult | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
            *,
            organizations:organizations (
              id,
              name,
              slug,
              billing_plan,
              seats_limit,
              documents_limit,
              metadata
            )
          `,
        )
        .eq("auth_user_id", authUserId)
        .maybeSingle<UserProfileWithOrganization>();

      if (error) {
        logger.error("Failed to load profile with organization", {
          authUserId,
          error,
        });
        return null;
      }

      if (!data) {
        logger.warn("No profile found for user when loading organization", {
          authUserId,
        });
        return null;
      }

      const profile = data as UserProfileWithOrganization;
      const organization = createOrganizationSummaryFromRow(
        Array.isArray(profile.organizations)
          ? profile.organizations[0] ?? null
          : profile.organizations ?? null,
      );
      const access = buildUserAccessContext(profile, organization);

      return {
        profile,
        organization,
        access,
      };
    } catch (error) {
      logger.error("Unexpected error resolving profile access context", {
        authUserId,
        error,
      });
      return null;
    }
  }
}
