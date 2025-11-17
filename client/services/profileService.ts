export interface SyncProfilePayload {
  profileId: string;
  authUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export async function syncUserProfile(payload: SyncProfilePayload) {
  const response = await fetch("/api/profile/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await safeParseJson(response);
    throw new Error(
      error?.error || error?.message || "Failed to sync user profile",
    );
  }

  return response.json();
}

async function safeParseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
