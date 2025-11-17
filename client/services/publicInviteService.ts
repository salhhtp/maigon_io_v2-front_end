import type {
  InviteAcceptanceRequest,
  InviteAcceptanceResponse,
  InviteTokenSummary,
} from "@shared/api";

class PublicInviteService {
  private static async jsonRequest<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      credentials: "include",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request to ${path} failed (${response.status})`);
    }

    return (await response.json()) as T;
  }

  static async getInviteDetails(token: string): Promise<InviteTokenSummary> {
    const payload = await this.jsonRequest<{ invite: InviteTokenSummary }>(
      `/api/public/invite/${encodeURIComponent(token)}`,
      {
        method: "GET",
      },
    );

    return payload.invite;
  }

  static async acceptInvite(
    token: string,
    payload: InviteAcceptanceRequest,
  ): Promise<InviteAcceptanceResponse> {
    return this.jsonRequest<InviteAcceptanceResponse>(
      `/api/public/invite/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }
}

export default PublicInviteService;
