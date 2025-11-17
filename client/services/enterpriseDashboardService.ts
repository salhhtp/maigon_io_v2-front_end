import type { EnterpriseDashboardResponse } from "@shared/api";

export async function fetchEnterpriseDashboard(
  authUserId: string,
  organizationId: string,
): Promise<EnterpriseDashboardResponse> {
  const query = new URLSearchParams({ organizationId });
  const response = await fetch(`/api/enterprise/dashboard?${query.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      "x-auth-user-id": authUserId,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(
      typeof message?.error === "string"
        ? message.error
        : `Failed to load enterprise dashboard (${response.status})`,
    );
  }

  const payload = (await response.json()) as EnterpriseDashboardResponse;
  return payload;
}

export default {
  fetchEnterpriseDashboard,
};
