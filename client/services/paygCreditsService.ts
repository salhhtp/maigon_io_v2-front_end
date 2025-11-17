import type {
  PaygBalanceResponse,
  PaygConsumeRequest,
  PaygConsumeResponse,
} from "@shared/api";

export class PaygCreditsService {
  static async getBalance(
    userId: string,
    options: { limit?: number } = {},
  ): Promise<PaygBalanceResponse> {
    const params = new URLSearchParams({ userId });
    if (typeof options.limit === "number" && options.limit > 0) {
      params.set("limit", String(options.limit));
    }

    const response = await fetch(`/api/billing/payg/balance?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to load PAYG balance");
    }

    return (await response.json()) as PaygBalanceResponse;
  }

  static async consume(request: PaygConsumeRequest): Promise<PaygConsumeResponse> {
    const response = await fetch("/api/billing/payg/consume", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "Failed to consume PAYG credits");
    }

    return (await response.json()) as PaygConsumeResponse;
  }
}

export default PaygCreditsService;
