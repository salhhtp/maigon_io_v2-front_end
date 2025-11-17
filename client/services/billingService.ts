import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
} from "@shared/api";

export async function createCheckoutSession(
  payload: CreateCheckoutSessionRequest,
): Promise<CreateCheckoutSessionResponse> {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message =
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : `Checkout failed (${response.status})`;
    throw new Error(message);
  }

  return (await response.json()) as CreateCheckoutSessionResponse;
}

export async function startPaygCheckout(
  userId: string,
  options: Omit<CreateCheckoutSessionRequest, "planKey" | "userId"> = {},
) {
  return createCheckoutSession({
    planKey: "pay_as_you_go",
    userId,
    ...options,
  });
}
