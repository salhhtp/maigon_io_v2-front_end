import Stripe from "stripe";
import {
  getPlanByKey,
  type PlanDefinition,
  type PlanKey,
} from "../../shared/plans";

let stripeClient: Stripe | null = null;

function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  return key && key.trim().length > 0 ? key : null;
}

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error(
      "Stripe secret key is not configured. Set STRIPE_SECRET_KEY in the environment.",
    );
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    appInfo: {
      name: "Maigon",
    },
  });

  return stripeClient;
}

export type CheckoutSessionOptions = {
  planKey: PlanKey;
  userId: string;
  email?: string | null;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

function resolveStripeIdentifiers(plan: PlanDefinition) {
  if (!plan.stripe || plan.stripe.mode === "none") {
    throw new Error(`Plan ${plan.key} is not configured for Stripe checkout.`);
  }

  const productId = process.env[plan.stripe.productEnvKey];
  const priceId = process.env[plan.stripe.priceEnvKey];

  if (!productId) {
    throw new Error(
      `Missing Stripe product env var ${plan.stripe.productEnvKey} for plan ${plan.key}.`,
    );
  }

  if (!priceId) {
    throw new Error(
      `Missing Stripe price env var ${plan.stripe.priceEnvKey} for plan ${plan.key}.`,
    );
  }

  return { productId, priceId, mode: plan.stripe.mode } as const;
}

export async function createCheckoutSession(
  options: CheckoutSessionOptions,
): Promise<Stripe.Checkout.Session> {
  const plan = getPlanByKey(options.planKey);
  if (!plan) {
    throw new Error(`Unknown plan: ${options.planKey}`);
  }

  const quantity = options.quantity && options.quantity > 0 ? options.quantity : 1;
  const { productId, priceId, mode } = resolveStripeIdentifiers(plan);
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    client_reference_id: options.userId,
    customer_email: options.email ?? undefined,
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    metadata: {
      planKey: plan.key,
      productId,
      priceId,
      quantity: String(quantity),
      ...options.metadata,
    },
  });

  return session;
}

export function getWebhookSecret(): string | null {
  const secret =
    process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  return secret && secret.trim().length > 0 ? secret : null;
}

export function buildStripeEvent(rawBody: Buffer, signature: string) {
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
