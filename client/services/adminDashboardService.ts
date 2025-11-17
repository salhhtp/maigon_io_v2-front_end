import type { AdminDashboardAnalytics } from "@shared/api";

function buildQuery(params?: { days?: number }): string {
  if (!params?.days) return "";
  const query = new URLSearchParams();
  if (params.days) {
    query.set("days", String(params.days));
  }
  return `?${query.toString()}`;
}

export async function fetchAdminDashboard(
  authUserId: string,
  params?: { days?: number },
): Promise<AdminDashboardAnalytics> {
  const query = buildQuery(params);
  const response = await fetch(`/api/admin/dashboard${query}`, {
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
        : `Failed to load admin dashboard (${response.status})`,
    );
  }

  const payload = (await response.json()) as AdminDashboardAnalytics;
  return payload;
}

export default {
  fetchAdminDashboard,
};
