import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildUserAccessContext,
  createOrganizationSummaryFromRow,
  type UserAccessContext,
} from "../../shared/api";
import { getSupabaseAdminClient } from "./supabaseAdmin";

type UserProfileAccessRow = {
  id: string;
  auth_user_id: string | null;
  role: "user" | "admin" | null;
  organization_id: string | null;
  organization_role: string | null;
  organizations?:
    | {
        id: string;
        name: string;
        slug?: string | null;
        billing_plan: string;
        seats_limit?: number | null;
        documents_limit?: number | null;
        metadata?: unknown;
      }
    | Array<{
        id: string;
        name: string;
        slug?: string | null;
        billing_plan: string;
        seats_limit?: number | null;
        documents_limit?: number | null;
        metadata?: unknown;
      }>
    | null;
};

export async function fetchUserAccessContext(
  client: SupabaseClient,
  authUserId: string,
): Promise<UserAccessContext | null> {
  const response = await client
    .from("user_profiles")
    .select(
      `
        id,
        auth_user_id,
        role,
        organization_id,
        organization_role,
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
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  if (!response.data) {
    return null;
  }

  const profile = response.data as UserProfileAccessRow;
  const organization = createOrganizationSummaryFromRow(
    Array.isArray(profile.organizations)
      ? profile.organizations[0] ?? null
      : profile.organizations ?? null,
  );

  return buildUserAccessContext(profile, organization);
}

export async function getUserAccessContextByAuthId(
  authUserId: string,
): Promise<UserAccessContext | null> {
  const client = getSupabaseAdminClient();
  return fetchUserAccessContext(client, authUserId);
}
