# AI Review Pipeline Validation & Rollout Plan

## 1. Preflight
- **Env vars**: set `OPENAI_REASONING_MODEL_DEFAULT`, `OPENAI_REASONING_MODEL_PREMIUM`, `OPENAI_REASONING_MODEL_INTENSIVE`, rotate API keys, store in 1Password + CI.
- **Feature flags**: `REASONING_PIPELINE_ENABLED`, `STRUCTURED_REPORT_UI_ENABLED`, default off in production, on in staging.
- **Seed data**: upload baseline contracts for all 7 playbooks (DPA, NDA, Privacy Policy, Consultancy, R&D, EULA, PSA) to staging bucket for repeatable tests.

## 2. Automated Tests
| Layer | Coverage | Tooling |
| --- | --- | --- |
| Schema | `shared/ai/reviewSchema` round-trip (valid + invalid) | Vitest |
| Reasoning orchestrator | mock fetch to ensure prompt structure, tier selection, Zod validation, critique notes | Vitest (Deno equivalent for Edge) |
| Fallback | deterministic snapshot ensuring `structured_report` exists even offline | Vitest (Node) |
| Client | ContractReview renders legacy + structured sections when `structured_report` present | Vitest + React Testing Library |
| Regression | `DataService.processContractWorkflow` ensures `structured_report` stored in review results | Integration test (Supabase test harness) |

Add these suites to CI (`npm test -- --run`) and block merges on failure.

## 3. Manual QA Checklist
1. **Staging** with feature flag on:
   - Upload sample for each playbook type, verify classification override respects selected solution.
   - Confirm General Information / Contract Summary / Issues / Criteria appear and match structured JSON.
   - Accept proposed edits, generate draft, inspect compare tab highlighting.
   - Force fallback (disable OPENAI API key) to ensure deterministic report still renders.
2. **Latency / token checks**:
   - Capture `usage` object from `runReasoningAnalysis` logs; ensure premium mode < $0.60/review, intensive < $2.
   - Validate `model_tier` stored with review for later analytics.
3. **Safety**: red-team sample contracts (PII, corrupted files) to confirm graceful degradation + warnings.

## 4. Rollout
1. **Canary (5% orgs)**: enable `REASONING_PIPELINE_ENABLED` for internal team + selected power users. Monitor:
   - Supabase logs: fallback rate %, reasoning errors, token spend.
   - Frontend telemetry: compare tab open rate, draft generation success.
2. **Phase 2 (25%)**: expand to enterprise tenants once error rate <2% over 48h. Add stakeholder demo.
3. **GA**: remove flag after 7-day stable run. Update marketing copy referencing GPT‑5 reasoning, publish changelog.

## 5. Monitoring & Alerts
- **Structured logs**: `reasoning_result` log with `model_tier`, `token_usage.totalCostUsd`, `contract_type`, `fallback_used`.
- **Metrics**: push to Supabase Edge log view + DataDog dashboard; set alerts when fallback rate >10% or cost >$3/review.
- **Sentry**: capture Zod validation failures, draft patcher errors, CloudConvert packaging retries.

## 6. Post-Launch
- Run weekly sample QA (one contract per playbook) to catch regressions.
- Gather stakeholder feedback via in-app survey tied to review exports.
- Backfill existing reviews with structured report using a migration script (optional) so historical data supports new UI.
