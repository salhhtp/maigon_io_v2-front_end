import type { AdminUserSummary } from "@shared/api";
import type { PlanDefinition } from "@shared/plans";

export interface PlanCatalogResponse {
  plans: PlanDefinition[];
}

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  planKey: string;
  planOverrides?: {
    contractsLimit?: number;
    documentsLimit?: number;
    seatsLimit?: number;
  };
  organization?:
    | { mode: "none" }
    | { mode: "existing"; organizationId: string; makeOrgAdmin?: boolean }
    | {
        mode: "new";
        name: string;
        slug?: string;
        billingPlan?: string;
        seatsLimit?: number;
        documentsLimit?: number;
        makeOrgAdmin?: boolean;
      };
}

export interface CreatedUserPayload {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    organizationId: string | null;
    organizationRole: string | null;
  };
  plan: {
    key: string;
    name: string;
    quotas: {
      contractsLimit: number;
      documentsLimit?: number;
      seatsLimit?: number;
    };
  };
  temporaryPassword: string;
}

export interface UpdateUserRequest {
  isActive?: boolean;
  planKey?: string;
  planOverrides?: {
    contractsLimit?: number;
    documentsLimit?: number;
    seatsLimit?: number;
  };
  organizationId?: string | null;
  organizationRole?: "member" | "org_admin" | null;
}

class AdminUserService {
  static async getPlanCatalog(authUserId: string): Promise<PlanDefinition[]> {
    const response = await fetch("/api/admin/plan-catalog", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": authUserId,
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to load plans (${response.status})`);
    }

    const payload = (await response.json()) as PlanCatalogResponse;
    return payload.plans;
  }

  static async createUser(
    authUserId: string,
    payload: CreateUserRequest,
  ): Promise<CreatedUserPayload> {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": authUserId,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to create user (${response.status}): ${text || "unknown error"}`,
      );
    }

    return (await response.json()) as CreatedUserPayload;
  }

  static async listUsers(authUserId: string): Promise<AdminUserSummary[]> {
    const response = await fetch("/api/admin/users", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": authUserId,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to load users (${response.status}): ${text || "unknown error"}`,
      );
    }

    const payload = (await response.json()) as { users: AdminUserSummary[] };
    return payload.users;
  }

  static async updateUser(
    authUserId: string,
    userId: string,
    payload: UpdateUserRequest,
  ): Promise<AdminUserSummary> {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": authUserId,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to update user (${response.status}): ${text || "unknown error"}`,
      );
    }

    const body = (await response.json()) as { user: AdminUserSummary };
    return body.user;
  }

  static async resetPassword(
    authUserId: string,
    userId: string,
  ): Promise<string> {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": authUserId,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to reset password (${response.status}): ${text || "unknown error"}`,
      );
    }

    const payload = (await response.json()) as { temporaryPassword: string };
    return payload.temporaryPassword;
  }
}

export default AdminUserService;
