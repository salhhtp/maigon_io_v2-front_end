import type {
  AdminOrganizationSummary,
  OrgAlertPreferences,
  OrgAdminProfileSummary,
} from "@shared/api";

interface CreateOrganizationPayload {
  name: string;
  slug?: string;
  billingPlan?: string;
  seatsLimit?: number;
  documentsLimit?: number;
  metadata?: Record<string, unknown>;
}

interface UpdateOrganizationPayload {
  billingPlan?: string;
  seatsLimit?: number;
  documentsLimit?: number;
  metadata?: Record<string, unknown>;
}

interface AssignOrgAdminPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  createIfMissing?: boolean;
}

interface AssignOrgAdminResponse {
  created: boolean;
  temporaryPassword?: string;
  user: OrgAdminProfileSummary;
}

class AdminOrgService {
  private static async request<T>(
    path: string,
    authUserId: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": authUserId,
        ...(options.headers ?? {}),
      },
      credentials: "include",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Admin request to ${path} failed (${response.status}): ${message}`,
      );
    }

    return (await response.json()) as T;
  }

  static listOrganizations(authUserId: string) {
    return this.request<{ organizations: AdminOrganizationSummary[] }>(
      "/api/admin/orgs",
      authUserId,
    ).then((payload) => payload.organizations);
  }

  static createOrganization(
    authUserId: string,
    payload: CreateOrganizationPayload,
  ) {
    return this.request<{ organization: AdminOrganizationSummary }>(
      "/api/admin/orgs",
      authUserId,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ).then((response) => response.organization);
  }

  static updateOrganization(
    authUserId: string,
    organizationId: string,
    payload: UpdateOrganizationPayload,
  ) {
    return this.request<{ organization: AdminOrganizationSummary }>(
      `/api/admin/orgs/${organizationId}`,
      authUserId,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ).then((response) => response.organization);
  }

  static assignOrganizationAdmin(
    authUserId: string,
    organizationId: string,
    payload: AssignOrgAdminPayload,
  ) {
    return this.request<AssignOrgAdminResponse>(
      `/api/admin/orgs/${organizationId}/assign-admin`,
      authUserId,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }
}

export type { AssignOrgAdminResponse, CreateOrganizationPayload, UpdateOrganizationPayload };
export default AdminOrgService;
