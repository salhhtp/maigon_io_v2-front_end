import "dotenv/config";
import Stripe from "stripe";

type PlanSyncConfig = {
  planKey: "pay_as_you_go" | "monthly_10";
  product: {
    name: string;
    description: string;
  };
  price: {
    currency: string;
    unitAmount: number;
    recurring?: { interval: Stripe.PriceCreateParams.Recurring.Interval } | null;
  };
  env: {
    product: string;
    price: string;
  };
};

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2024-06-20";

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Export it in your environment or add it to the .env file before running this script.",
    );
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    appInfo: {
      name: "Maigon Pricing Sync",
    },
  });
}

const PLAN_CONFIGS: PlanSyncConfig[] = [
  {
    planKey: "pay_as_you_go",
    product: {
      name: "Maigon Pay-As-You-Go",
      description: "Single contract reviews with instant compliance reporting",
    },
    price: {
      currency: "eur",
      unitAmount: 6900,
    },
    env: {
      product: "STRIPE_PRODUCT_PAYG",
      price: "STRIPE_PRICE_PAYG_EUR",
    },
  },
  {
    planKey: "monthly_10",
    product: {
      name: "Maigon Monthly Subscription",
      description: "Subscription bundle with 10 monthly contract reviews",
    },
    price: {
      currency: "eur",
      unitAmount: 59000,
      recurring: { interval: "month" },
    },
    env: {
      product: "STRIPE_PRODUCT_MONTHLY_SUBSCRIPTION",
      price: "STRIPE_PRICE_MONTHLY_SUBSCRIPTION_EUR",
    },
  },
];

async function findProductByPlanKey(
  stripe: Stripe,
  planKey: string,
): Promise<Stripe.Product | null> {
  const searchSupported = typeof stripe.products.search === "function";

  if (searchSupported) {
    const query = `metadata['plan_key']:'${planKey}'`;
    const result = await stripe.products.search({ query, limit: 1 });
    if (result.data.length > 0) {
      return result.data[0];
    }
  }

  // Fallback to list + filter if search unavailable in the account
  const list = await stripe.products.list({ limit: 100, active: true });
  return (
    list.data.find((product) => product.metadata?.plan_key === planKey) ?? null
  );
}

async function ensureProduct(
  stripe: Stripe,
  config: PlanSyncConfig,
): Promise<Stripe.Product> {
  const existing = await findProductByPlanKey(stripe, config.planKey);

  if (existing) {
    const needsUpdate =
      existing.name !== config.product.name ||
      existing.description !== config.product.description;

    if (needsUpdate) {
      const updated = await stripe.products.update(existing.id, {
        name: config.product.name,
        description: config.product.description,
      });
      return updated;
    }

    return existing;
  }

  return stripe.products.create({
    name: config.product.name,
    description: config.product.description,
    metadata: {
      plan_key: config.planKey,
    },
  });
}

function priceMatchesConfig(price: Stripe.Price, config: PlanSyncConfig): boolean {
  const unitAmountMatches = price.unit_amount === config.price.unitAmount;
  const currencyMatches = price.currency === config.price.currency;

  if (!unitAmountMatches || !currencyMatches) {
    return false;
  }

  const isRecurringConfig = Boolean(config.price.recurring);
  const isRecurringPrice = Boolean(price.recurring);

  if (isRecurringConfig !== isRecurringPrice) {
    return false;
  }

  if (isRecurringConfig && price.recurring && config.price.recurring) {
    return price.recurring.interval === config.price.recurring.interval;
  }

  return true;
}

async function ensurePrice(
  stripe: Stripe,
  product: Stripe.Product,
  config: PlanSyncConfig,
): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: product.id, limit: 100, active: true });

  const matchingPrice = prices.data.find((price) =>
    priceMatchesConfig(price, config),
  );

  if (matchingPrice) {
    return matchingPrice;
  }

  // Deactivate other active prices for this plan to avoid ambiguity
  await Promise.all(
    prices.data.map((price) =>
      stripe.prices.update(price.id, { active: false }).catch((error) => {
        console.warn(`Unable to deactivate price ${price.id}:`, error.message);
        return null;
      }),
    ),
  );

  const createParams: Stripe.PriceCreateParams = {
    currency: config.price.currency,
    unit_amount: config.price.unitAmount,
    product: product.id,
    metadata: {
      plan_key: config.planKey,
    },
  };

  if (config.price.recurring) {
    createParams.recurring = config.price.recurring;
  }

  const price = await stripe.prices.create(createParams);
  return price;
}

async function main() {
  try {
    const stripe = getStripeClient();
    console.log("\nSynchronising Stripe products and prices for Maigon plans...\n");

    const results: Array<{
      planKey: string;
      productId: string;
      priceId: string;
      envProduct: string;
      envPrice: string;
    }> = [];

    for (const config of PLAN_CONFIGS) {
      console.log(`Processing plan: ${config.planKey}`);
      const product = await ensureProduct(stripe, config);
      const price = await ensurePrice(stripe, product, config);

      console.log(
        `  ✓ Product ${product.id} (${product.name}) and price ${price.id} ready`,
      );

      results.push({
        planKey: config.planKey,
        productId: product.id,
        priceId: price.id,
        envProduct: config.env.product,
        envPrice: config.env.price,
      });
    }

    console.log("\nStripe plan sync complete. Update your environment variables with:");
    console.table(
      results.map((item) => ({
        Plan: item.planKey,
        [item.envProduct]: item.productId,
        [item.envPrice]: item.priceId,
      })),
    );

    console.log(
      "\nTip: add these values to your deployment secrets and restart the server to pick them up.",
    );
  } catch (error) {
    console.error("\nStripe plan sync failed:\n");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

void main();
