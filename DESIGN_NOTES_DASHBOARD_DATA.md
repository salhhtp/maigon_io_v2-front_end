# Dashboard Data Integration Plan

## Goals
- Remove remaining mock analytics from the internal admin dashboard (`client/pages/Dashboard.tsx`) and enterprise dashboard (`client/pages/EnterpriseDashboard.tsx`).
- Serve live metrics from Supabase for both Maigon admins and organization admins without introducing new mock fallbacks.

## Existing State
- `Dashboard.tsx` renders entirely from the hard-coded `analyticsData`, `allUsers`, and `allSolutions` arrays.
- `EnterpriseDashboard.tsx` uses local constants for executive summaries, adoption metrics, etc.
- `AdminAnalyticsService` already surfaces a subset of metrics: platform overview, usage summaries, and top users.
- `OrgAdminService` fetches real organization metrics for org-admin dashboards using Supabase views.
- There is no consolidated “admin dashboard” endpoint today; the frontend never calls `DataService.getAdminDashboardData()`.

## Proposed Service Contracts

1. **Maigon Admin Dashboard**
   - New server route: `GET /api/admin/dashboard`.
   - Resolver aggregates:
     - Platform overview (total users, active users, MRR, contracts reviewed) from existing Supabase tables (`user_profiles`, `user_usage_stats`, `contracts`, `admin_analytics`).
     - Trending data (7/30 day series for users/contracts/revenue) via SQL window functions or existing `admin_analytics` rows.
     - User segmentation (plans, geography) using `user_profiles` joins on `user_plans` and `organizations`.
     - Top users (highest contract volume, recent activity) via `user_usage_stats`.
   - Response shape: `{ overview, trend, segmentation, topUsers, solutionsSummary }` where each section matches what the UI expects.
   - Update `DataService.getAdminDashboardData()` to call this new endpoint, expose typed helpers (e.g. `AdminDashboardOverview`).

2. **Enterprise Dashboard**
   - Extend `OrgAdminService` with `getEnterpriseOverview(organizationId)` that aggregates:
     - Workspace count (dependent orgs, teams).
     - Active seats, contract volume (from `contracts` + `user_profiles`).
     - Regional risk heat maps using `analysis_metrics` or `admin_analytics` filtered by org.
   - Provide additional metrics (pending approvals, automation suggestions) by summarizing `contract_reviews`, `workflow_tasks`, or we create new Supabase RPC functions.
   - Response shape focuses on `{summary, adoption, riskHeat, workflowSuggestions}` to populate existing cards.

3. **API Implementation Notes**
   - Add new Express routers under `server/routes/adminDashboard.ts` and `server/routes/enterpriseDashboard.ts`.
   - Use `getSupabaseAdminClient()` to run SQL queries or call RPC functions. All aggregation logic lives server-side to avoid exposing sensitive data to the client.
   - Cache the heavy queries briefly (e.g. in-memory 60s) to keep dashboards snappy.

## Frontend Changes
- Replace static constants in `Dashboard.tsx` with hooks that call `DataService.adminDashboard.getOverview()` etc., adding skeleton states similar to the admin analytics page.
- Update `EnterpriseDashboard.tsx` to consume the new service; remove hard-coded arrays.
- Rip out `baseMockUsers`, `mockDb` fallbacks, and gate any demo-specific flow behind `VITE_ENABLE_DEMO_LOGIN` or remove entirely if unused. ✅ Completed.
- Ensure reusable components (metric cards, charts) accept undefined/empty data gracefully.

## Next Steps
1. Implement back-end routes/queries for `/api/admin/dashboard` and `/api/enterprise-dashboard/:orgId`.
2. Extend `DataService` with typed clients for the new endpoints.
3. Refactor the React pages to use `useEffect`/React Query, loading states, and meaningful empty-state messages.
4. Remove mock data modules and demo-only contexts or hide them behind env flags.
