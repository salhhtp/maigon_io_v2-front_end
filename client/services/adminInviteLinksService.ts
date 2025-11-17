import type {
  CreateInviteLinkRequest,
  CreateInviteLinkResponse,
  OrgInviteLinkSummary,
} from "@shared/api";

class AdminInviteLinksService {
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
        `Admin invite request to ${path} failed (${response.status}): ${message || "unknown error"}`,
      );
    }

    return (await response.json()) as T;
  }

  static async listInvites(authUserId: string): Promise<OrgInviteLinkSummary[]> {
    const payload = await this.request<{ invites: OrgInviteLinkSummary[] }>(
      "/api/admin/invite-links",
      authUserId,
      {
        method: "GET",
      },
    );

    return payload.invites ?? [];
  }

  static async createInvite(
    authUserId: string,
    payload: CreateInviteLinkRequest,
  ): Promise<CreateInviteLinkResponse> {
    return this.request<CreateInviteLinkResponse>(
      "/api/admin/invite-links",
      authUserId,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }
}

export default AdminInviteLinksService;
