# Pricing & Billing Rollout Checklist

This checklist covers everything required to validate and launch the new Maigon pricing plans across the SPA, Express backend, and Stripe billing integration.

## 1. Stripe Configuration

1. Log in to the appropriate Stripe account (test first, live later).
2. Create or update the following products and recurring/one-time prices (run `npm run stripe:sync` to automate):
   - **Pay-As-You-Go** (one-time price, €69 per contract).
   - **Monthly Subscription** (recurring monthly price, €590 for 10 contracts).
3. Record the product and price IDs and populate these environment variables (the sync script prints the values after it finishes):

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRODUCT_PAYG=prod_...
   STRIPE_PRICE_PAYG_EUR=price_...
   STRIPE_PRODUCT_MONTHLY_SUBSCRIPTION=prod_...
   STRIPE_PRICE_MONTHLY_SUBSCRIPTION_EUR=price_...
   ```

4. (Optional) Create a billing portal configuration in Stripe if customer self-management is desired later.

## 2. Local Environment Setup

1. Run database migrations to add billing columns and the transaction ledger:

   ```bash
   npx supabase migration up # or run through your deployment pipeline
   ```

2. Restart the dev server so Express picks up new env vars:

   ```bash
   npm run dev
   ```

3. Use Stripe CLI to forward webhooks while developing locally:

   ```bash
   stripe login
   stripe listen --forward-to localhost:8080/api/billing/webhook
   ```

## 3. Functional Testing (Test Mode)

1. **Free Trial**: Ensure the UI shows the refreshed copy and limits (5 agreements, 14-day window). No checkout required.
2. **Pay-As-You-Go checkout**:
   - Log in with a test account.
   - Choose Pay-As-You-Go on `/pricing`.
   - Complete Stripe test checkout and confirm redirect.
   - Verify `billing_transactions` and `user_plans` tables capture the session/payment IDs.
3. **Monthly Subscription checkout**:
   - Repeat with the Monthly Subscription plan.
   - Confirm a Stripe subscription is created and `user_plans` stores subscription metadata and period dates.
4. **Enterprise CTA**: Ensure consultation buttons route to the contact/demo flow.
5. **Pricing Calculator**: Move the slider across thresholds (1, 5, 10, 15) to confirm recommendations change to Pay-As-You-Go, Monthly Subscription, and Enterprise appropriately.

## 4. Webhook Validation

1. Trigger `checkout.session.completed` in test mode and confirm the webhook handler updates the ledger and user plans.
2. Trigger `invoice.payment_succeeded` (e.g., via Stripe dashboard) and confirm `current_period_end` and `billing_status` update.
3. Trigger `customer.subscription.updated/cancelled` and confirm cancel at period end flags are reflected.

## 5. Frontend Regression Pass

- Review `/pricing`, `/public-pricing`, dashboards, and trial onboarding flows for the new copy and plan names.
- Validate that free trial messaging now references 5 agreements / 14 days and monthly plan references €590.
- Confirm plan filters, comparison tables, and sample data sets (e.g., admin tables) use the updated plan names.

## 6. Pre-Deployment Checklist

1. Promote Supabase migrations to staging/production.
2. Set the Stripe environment variables in the deployment platform secrets store.
3. Redeploy the application (server + client) to ensure `/api/billing` routes and SPA copy go live.
4. Reconfigure any analytics dashboards or alerts that referenced legacy plan names (`Monthly 10`, `Monthly 15`).
5. Communicate the pricing change to Customer Success/Support along with new savings figures and limits.

## 7. Production Smoke Test

1. Run a live-mode €69 Pay-As-You-Go test purchase (use real payment method if policy allows) and refund afterwards.
2. Create a live-mode Monthly Subscription using Stripe test customers flagged as internal and cancel after verification.
3. Confirm email receipts, billing portal access (if enabled), and Supabase plan records match Stripe events.

Following this checklist ensures the new pricing structure, UI copy, and billing integration land cohesively in production.
