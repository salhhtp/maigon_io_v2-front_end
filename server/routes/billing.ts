import express from "express";
import type Stripe from "stripe";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import {
  createCheckoutSession,
  buildStripeEvent,
  getStripeClient,
} from "../lib/stripe";
import {
  getPlanByKey,
  type PlanDefinition,
  type PlanKey,
} from "../../shared/plans";
import type {
  PaygBalanceResponse,
  PaygConsumeRequest,
} from "../../shared/api";

const billingRouter = express.Router();

const APP_BASE_URL = (
  process.env.PUBLIC_APP_URL ||
  process.env.APP_ORIGIN ||
  process.env.PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

interface CheckoutRequestBody {
  planKey: PlanKey;
  userId: string;
  email?: string;
  quantity?: number;
  organizationId?: string;
  successPath?: string;
  cancelPath?: string;
  metadata?: Record<string, string>;
}

async function applyPaygCreditDelta(options: {
  userId: string;
  delta: number;
  reason: string;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { userId } = options;
  const deltaInt = Number.isFinite(options.delta)
    ? Math.trunc(options.delta)
    : 0;

  if (deltaInt === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  const { data: existing, error: selectError } = await supabase
    .from("user_payg_balances")
    .select("id, credits_balance, credits_purchased, credits_consumed")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to load PAYG balance: ${selectError.message}`);
  }

  const previousBalance = existing?.credits_balance ?? 0;
  const previousPurchased = existing?.credits_purchased ?? 0;
  const previousConsumed = existing?.credits_consumed ?? 0;

  const creditsBalance = Math.max(previousBalance + deltaInt, 0);
  const creditsPurchased =
    previousPurchased + (deltaInt > 0 ? deltaInt : 0);
  const creditsConsumed =
    previousConsumed + (deltaInt < 0 ? Math.abs(deltaInt) : 0);

  if (existing) {
    const { error: updateError } = await supabase
      .from("user_payg_balances")
      .update({
        credits_balance: creditsBalance,
        credits_purchased: creditsPurchased,
        credits_consumed: creditsConsumed,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update PAYG balance: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase
      .from("user_payg_balances")
      .insert({
        user_id: userId,
        credits_balance: Math.max(deltaInt, 0),
        credits_purchased: deltaInt > 0 ? deltaInt : 0,
        credits_consumed: deltaInt < 0 ? Math.abs(deltaInt) : 0,
      });

    if (insertError) {
      throw new Error(`Failed to create PAYG balance: ${insertError.message}`);
    }
  }

  const { error: ledgerError } = await supabase.from("user_payg_ledger").insert({
    user_id: userId,
    delta: deltaInt,
    reason: options.reason,
    reference_id: options.referenceId ?? null,
    metadata: options.metadata ?? {},
  });

  if (ledgerError) {
    throw new Error(`Failed to log PAYG ledger entry: ${ledgerError.message}`);
  }
}

function resolveSuccessUrl(
  plan: PlanDefinition,
  requestedPath: string | undefined,
): string {
  const basePath = requestedPath || "/billing/success";
  return `${APP_BASE_URL}${basePath}?session_id={CHECKOUT_SESSION_ID}&plan=${plan.key}`;
}

function resolveCancelUrl(requestedPath: string | undefined): string {
  const basePath = requestedPath || "/pricing";
  return `${APP_BASE_URL}${basePath}?checkout=cancelled`;
}

function assertPlanSupportsCheckout(plan: PlanDefinition) {
  if (!plan.stripe || plan.stripe.mode === "none") {
    throw new Error(`Plan ${plan.key} cannot be purchased via Stripe checkout.`);
  }
}

type PaygBalanceRow = {
  credits_balance: number | null;
  credits_purchased: number | null;
  credits_consumed: number | null;
  updated_at: string | null;
};

type PaygLedgerRow = {
  id: string;
  delta: number;
  reason: string;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

async function recordCheckoutSession(options: {
  session: Stripe.Checkout.Session;
  plan: PlanDefinition;
  userId: string;
  organizationId?: string;
  quantity: number;
  metadata?: Record<string, string>;
}) {
  const supabase = getSupabaseAdminClient();
  const amountCents =
    typeof options.session.amount_subtotal === "number"
      ? options.session.amount_subtotal
      : Math.round(options.plan.price * 100 * options.quantity);

  await supabase.from("billing_transactions").insert({
    user_id: options.userId,
    organization_id: options.organizationId ?? null,
    plan_key: options.plan.key,
    stripe_checkout_session_id: options.session.id,
    quantity: options.quantity,
    amount_cents: amountCents,
    currency: options.session.currency ?? "eur",
    status: options.session.status ?? "open",
    metadata: {
      ...(options.metadata ?? {}),
      planKey: options.plan.key,
    },
  });
}

async function loadPaygSnapshot(
  userId: string,
  ledgerLimit = 20,
): Promise<PaygBalanceResponse> {
  const supabase = getSupabaseAdminClient();

  const { data: balanceRow, error: balanceError } = await supabase
    .from("user_payg_balances")
    .select(
      "credits_balance, credits_purchased, credits_consumed, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<PaygBalanceRow>();

  if (balanceError) {
    throw new Error(`Failed to fetch PAYG balance: ${balanceError.message}`);
  }

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("user_payg_ledger")
    .select("id, delta, reason, reference_id, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(ledgerLimit, 0));

  if (ledgerError) {
    throw new Error(`Failed to fetch PAYG ledger: ${ledgerError.message}`);
  }

  const balance = {
    creditsBalance: balanceRow?.credits_balance ?? 0,
    creditsPurchased: balanceRow?.credits_purchased ?? 0,
    creditsConsumed: balanceRow?.credits_consumed ?? 0,
    updatedAt: balanceRow?.updated_at ?? null,
  };

  const ledger = (ledgerRows ?? []).map((row) => {
    const entry = row as PaygLedgerRow;
    return {
      id: entry.id,
      delta: entry.delta,
      reason: entry.reason,
      referenceId: entry.reference_id ?? null,
      metadata: entry.metadata ?? {},
      createdAt: entry.created_at,
    };
  });

  return { balance, ledger };
}

billingRouter.post("/checkout", async (req, res) => {
  const body = req.body as CheckoutRequestBody;

  if (!body.planKey || !body.userId) {
    res.status(400).json({ error: "planKey and userId are required" });
    return;
  }

  const plan = getPlanByKey(body.planKey);

  if (!plan) {
    res.status(404).json({ error: `Unknown plan ${body.planKey}` });
    return;
  }

  try {
    assertPlanSupportsCheckout(plan);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Plan not available for checkout";
    res.status(400).json({ error: message });
    return;
  }

  try {

    const successUrl = resolveSuccessUrl(plan, body.successPath);
    const cancelUrl = resolveCancelUrl(body.cancelPath);

    const session = await createCheckoutSession({
      planKey: plan.key,
      userId: body.userId,
      email: body.email,
      quantity: body.quantity,
      successUrl,
      cancelUrl,
      metadata: {
        ...(body.metadata ?? {}),
        organizationId: body.organizationId ?? "",
      },
    });

    await recordCheckoutSession({
      session,
      plan,
      userId: body.userId,
      organizationId: body.organizationId,
      quantity: body.quantity && body.quantity > 0 ? body.quantity : 1,
      metadata: body.metadata,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("[billing] Failed to create checkout session", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

billingRouter.get("/payg/balance", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : null;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const limitRaw = typeof req.query.limit === "string" ? req.query.limit : undefined;
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
  const ledgerLimit = Number.isNaN(limitParsed) || limitParsed <= 0 ? 20 : limitParsed;

  try {
    const snapshot = await loadPaygSnapshot(userId, ledgerLimit);
    res.json(snapshot);
  } catch (error) {
    console.error("[billing] Failed to fetch PAYG balance", error);
    res.status(500).json({ error: "Failed to load PAYG balance" });
  }
});

billingRouter.post("/payg/consume", async (req, res) => {
  const body = req.body as PaygConsumeRequest;

  if (!body.userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const amountParsed =
    typeof body.amount === "number"
      ? body.amount
      : body.amount === undefined
        ? 1
        : Number.parseInt(String(body.amount), 10);
  const amount = Number.isFinite(amountParsed)
    ? Math.abs(Math.trunc(amountParsed))
    : 1;

  if (amount <= 0) {
    res.status(400).json({ error: "amount must be greater than zero" });
    return;
  }

  try {
    await applyPaygCreditDelta({
      userId: body.userId,
      delta: -amount,
      reason: body.reason ?? "consumption",
      referenceId: body.referenceId ?? null,
      metadata: body.metadata ?? {},
    });

    const snapshot = await loadPaygSnapshot(body.userId, 10);
    res.json({ balance: snapshot.balance });
  } catch (error) {
    console.error("[billing] Failed to consume PAYG credits", error);
    res.status(500).json({ error: "Failed to consume PAYG credits" });
  }
});

async function upsertUserPlanFromSubscription(options: {
  plan: PlanDefinition;
  userId: string;
  session: Stripe.Checkout.Session;
  subscription: Stripe.Subscription | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { plan, userId, session, subscription } = options;

  await supabase.from("user_plans").upsert(
    {
      user_id: userId,
      plan_type: plan.key,
      plan_name: plan.name,
      price: plan.price,
      contracts_limit: plan.quotas.contractsLimit,
      documents_limit: plan.quotas.documentsLimit ?? null,
      seats_limit: plan.quotas.seatsLimit ?? null,
      billing_cycle: plan.billingCycle,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null,
      stripe_checkout_session_id: session.id,
      stripe_subscription_id: subscription?.id ?? null,
      stripe_price_id: subscription?.items?.data?.[0]?.price?.id ?? null,
      stripe_product_id: subscription?.items?.data?.[0]?.price?.product
        ? String(subscription.items.data[0].price.product)
        : session.metadata?.productId ?? null,
      billing_status: subscription?.status ?? "active",
      current_period_start: subscription?.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription?.cancel_at_period_end ?? null,
      next_billing_date: subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      trial_days_remaining:
        plan.billingCycle === "trial"
          ? plan.trialDurationDays ?? plan.quotas.contractsLimit
          : null,
      features: plan.features,
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function upsertUserPlanForOneTime(options: {
  plan: PlanDefinition;
  userId: string;
  session: Stripe.Checkout.Session;
  paymentIntentId: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { plan, userId, session, paymentIntentId } = options;

  await supabase.from("user_plans").upsert(
    {
      user_id: userId,
      plan_type: plan.key,
      plan_name: plan.name,
      price: plan.price,
      contracts_limit: plan.quotas.contractsLimit,
      documents_limit: plan.quotas.documentsLimit ?? null,
      seats_limit: plan.quotas.seatsLimit ?? null,
      billing_cycle: plan.billingCycle,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null,
      stripe_checkout_session_id: session.id,
      stripe_subscription_id: null,
      stripe_price_id: session.metadata?.priceId ?? null,
      stripe_product_id: session.metadata?.productId ?? null,
      billing_status: session.payment_status ?? "paid",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: null,
      next_billing_date: null,
      trial_days_remaining:
        plan.billingCycle === "trial"
          ? plan.trialDurationDays ?? plan.quotas.contractsLimit
          : null,
      features: plan.features,
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    },
    { onConflict: "user_id" },
  );
}

async function updateBillingTransactionFromSession(
  session: Stripe.Checkout.Session,
) {
  const supabase = getSupabaseAdminClient();

  await supabase
    .from("billing_transactions")
    .update({
      status: session.payment_status ?? session.status ?? "completed",
      stripe_payment_intent_id: typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
      stripe_invoice_id: typeof session.invoice === "string"
        ? session.invoice
        : session.invoice?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id);
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const planKey = (session.metadata?.planKey as PlanKey | undefined) ?? null;
  const userId = session.client_reference_id ?? null;

  if (!planKey || !userId) {
    console.warn(
      "[billing] checkout.session.completed missing planKey or userId",
      session.id,
    );
    return;
  }

  const plan = getPlanByKey(planKey);
  if (!plan) {
    console.warn("[billing] Unknown plan in checkout session", {
      planKey,
      session: session.id,
    });
    return;
  }

  await updateBillingTransactionFromSession(session);

  if (plan.stripe?.mode === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    let subscription: Stripe.Subscription | null = null;

    if (subscriptionId) {
      try {
        const stripe = getStripeClient();
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (error) {
        console.error(
          "[billing] Failed to retrieve subscription after checkout",
          error,
        );
      }
    }

    await upsertUserPlanFromSubscription({
      plan,
      userId,
      session,
      subscription,
    });
  } else {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    await upsertUserPlanForOneTime({
      plan,
      userId,
      session,
      paymentIntentId,
    });

    if (plan.payg?.creditsPerCheckout) {
      const quantityValue = session.metadata?.quantity
        ? Number.parseInt(session.metadata.quantity, 10)
        : 1;
      const quantity = Number.isNaN(quantityValue) || quantityValue <= 0
        ? 1
        : quantityValue;
      const creditsToGrant = plan.payg.creditsPerCheckout * quantity;
      try {
        await applyPaygCreditDelta({
          userId,
          delta: creditsToGrant,
          reason: "purchase",
          referenceId: session.id,
          metadata: {
            planKey: plan.key,
            paymentIntentId: paymentIntentId ?? undefined,
          },
        });
      } catch (error) {
        console.error("[billing] Failed to apply PAYG credit purchase", {
          error,
          userId,
          sessionId: session.id,
        });
      }
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return;
  }

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;

  const supabase = getSupabaseAdminClient();
  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  const periodStart = invoice.lines?.data?.[0]?.period?.start;

  await supabase
    .from("user_plans")
    .update({
      billing_status: invoice.status ?? "paid",
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      next_billing_date: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      stripe_invoice_id: invoice.id,
      last_synced_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
) {
  const supabase = getSupabaseAdminClient();

  await supabase
    .from("user_plans")
    .update({
      billing_status: subscription.status,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? null,
      next_billing_date: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
      stripe_product_id: subscription.items.data[0]?.price?.product
        ? String(subscription.items.data[0]?.price?.product)
        : null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

export async function billingWebhookHandler(
  req: express.Request,
  res: express.Response,
) {
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).send("Missing Stripe signature header");
    return;
  }

  let event: Stripe.Event;

  try {
    event = buildStripeEvent(req.body as Buffer, signature);
  } catch (error) {
    console.error("[billing] Invalid Stripe webhook signature", error);
    res.status(400).send("Invalid signature");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        console.info("[billing] Unhandled Stripe event", event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[billing] Error processing Stripe webhook", error);
    res.status(500).send("Webhook handler error");
  }
}

export { billingRouter };
