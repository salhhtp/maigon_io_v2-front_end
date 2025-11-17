export type PlanKey =
  | "free_trial"
  | "pay_as_you_go"
  | "monthly_10"
  | "monthly_15"
  | "professional";

export type PlanQuota = {
  contractsLimit: number;
  documentsLimit?: number;
  seatsLimit?: number;
};

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  billingCycle: "trial" | "per_contract" | "monthly" | "custom";
  price: number;
  description: string;
  features: string[];
  quotas: PlanQuota;
  trialDurationDays?: number;
  reportStorageDays?: number | "permanent";
  isPublic?: boolean;
  stripe?:
    | {
        mode: "none";
      }
    | {
        mode: "payment" | "subscription";
        productEnvKey: string;
        priceEnvKey: string;
      };
  payg?: {
    creditsPerCheckout: number;
    allowTopUp?: boolean;
  };
};

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    key: "free_trial",
    name: "Free Trial",
    billingCycle: "trial",
    price: 0,
    description: "Perfect for getting started with our platform",
    features: [
      "Review up to 5 agreements within a 14-day trial period",
      "Full compliance report with risk assessment",
      "Clause extraction and recommendations",
      "Access to all 7 contract type modules",
      "Professional-grade analysis (worth €69)",
      "Personal dashboard access",
      "Contract review history tracking",
      "Report storage for 7 days",
    ],
    quotas: {
      contractsLimit: 5,
    },
    trialDurationDays: 14,
    reportStorageDays: 7,
    isPublic: true,
    stripe: { mode: "none" },
  },
  {
    key: "pay_as_you_go",
    name: "Pay As You Go",
    billingCycle: "per_contract",
    price: 69,
    description: "Perfect for occasional contract review needs",
    features: [
      "Instant compliance reports",
      "All 7 contract type modules included",
      "Risk assessment and scoring",
      "Clause extraction with recommendations",
      "Email support (48-hour response)",
      "Permanent report storage",
      "Unlimited report downloads in multiple formats",
    ],
    quotas: {
      contractsLimit: 999999,
    },
    reportStorageDays: "permanent",
    isPublic: true,
    payg: {
      creditsPerCheckout: 1,
      allowTopUp: true,
    },
    stripe: {
      mode: "payment",
      productEnvKey: "STRIPE_PRODUCT_PAYG",
      priceEnvKey: "STRIPE_PRICE_PAYG_EUR",
    },
  },
  {
    key: "monthly_10",
    name: "Monthly Subscription",
    billingCycle: "monthly",
    price: 590,
    description: "Save with a volume package (10 contracts per month)",
    features: [
      "10 contracts per month (effective €59 per contract)",
      "Access to personal dashboard and analytics",
      "Priority processing",
      "Enhanced email support (48-hour response)",
      "90-day usage analytics and reporting",
      "Advanced playbook templates",
      "Monthly billing cycle",
      "Cancel anytime with 30-day notice",
    ],
    quotas: {
      contractsLimit: 10,
      seatsLimit: 10,
      documentsLimit: 200,
    },
    reportStorageDays: "permanent",
    isPublic: true,
    stripe: {
      mode: "subscription",
      productEnvKey: "STRIPE_PRODUCT_MONTHLY_SUBSCRIPTION",
      priceEnvKey: "STRIPE_PRICE_MONTHLY_SUBSCRIPTION_EUR",
    },
  },
  {
    key: "monthly_15",
    name: "Monthly 15",
    billingCycle: "monthly",
    price: 999,
    description: "Higher throughput with collaboration",
    features: [
      "15 contracts per month",
      "High risk alerting",
      "Org admin controls",
    ],
    quotas: {
      contractsLimit: 15,
      seatsLimit: 15,
      documentsLimit: 400,
    },
    reportStorageDays: "permanent",
    isPublic: false,
  },
  {
    key: "professional",
    name: "Enterprise Plan",
    billingCycle: "custom",
    price: 0,
    description: "Tailored for high-volume or multi-user teams",
    features: [
      "Unlimited contract reviews",
      "Custom pricing based on usage & team size",
      "Dedicated account manager",
      "API access & custom integrations",
      "Advanced analytics & reporting",
      "Priority support & training",
    ],
    quotas: {
      contractsLimit: 999999,
      seatsLimit: 50,
      documentsLimit: 10000,
    },
    reportStorageDays: "permanent",
    isPublic: true,
  },
];

export function getPlanByKey(key: string): PlanDefinition | undefined {
  return PLAN_CATALOG.find((plan) => plan.key === key);
}

export function getPlanStripeConfig(
  key: PlanKey,
): PlanDefinition["stripe"] | undefined {
  return getPlanByKey(key)?.stripe;
}

export function getPublicPlans(): PlanDefinition[] {
  return PLAN_CATALOG.filter((plan) => plan.isPublic !== false);
}
