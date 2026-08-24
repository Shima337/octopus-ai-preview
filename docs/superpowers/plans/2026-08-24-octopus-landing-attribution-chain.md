# Octopus AI Landing Attribution Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve original advertising attribution from the public Octopus AI landing through Marketing Click, Telegram identity, Learning Path, and first/latest analytics while recording the exact landing CTA separately.

**Architecture:** Extend the existing `AdClickCapture` contract with two nullable, registry-normalized landing dimensions, then make the landing merge its allowlisted arrival attribution into the configured `funnel=learning_path` Marketing Click URL. The existing short `c_<click_id>` payload, Telegram claim, identity linkage, Learning Path destination, and first/latest analytics delivery remain authoritative.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, FastAPI, SQLAlchemy, Alembic, pytest, PostgreSQL/SQLite test harness.

**Spec:** `docs/superpowers/specs/2026-08-24-octopus-landing-attribution-chain-design.md`

## Global constraints

- Landing source is `Shima337/octopus-ai-preview`; implementation continues in isolated branch `codex/landing-attribution-chain` from audited `origin/main@3ed7f53691fc714438f8ed4a1f979834bfc26ed7`.
- Backend implementation starts in a fresh isolated Turbo Wedge worktree from the then-current `origin/octopus-dev-recovery`; the audited design baseline was `84e96b1cb358cbbe545ac3ef3d567822a63f977e`.
- `/learning-map/` remains frozen. The destination is the existing `/learning-path/` contract.
- Preserve every supported incoming advertising value without rewriting it: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `ttclid`, `gclid`, `campaign_id`, `adset_id`, `ad_id`, `creative_id`, and advertising `placement`.
- Add only `landing_surface=octopus_ai` and `landing_cta=hero|games|pricing|final`; unknown backend values normalize to `NULL` with diagnostics.
- The configured Marketing Click URL remains authoritative for `funnel=learning_path`; arrival query parameters cannot override product selectors or landing dimensions.
- Do not introduce a new endpoint, table, click identity, Telegram payload, bot route, cookie, local/session storage, provider, or arbitrary query forwarding.
- Production landing validation must fail closed unless the configured transport is the Marketing Click API. Explicit safe draft/test Telegram transport remains supported.
- No push, DEV/PROD deploy, production database migration, or traffic change is included. Those require separate owner commands.

---

### Stage 1: Extend the canonical backend attribution contract

**Repository:** `C:\xProjects\turbo_wedge`

**Files:**

- Create: `russian-diagnostic/backend/alembic/versions/0063_landing_attribution_dimensions.py`
- Create: `russian-diagnostic/backend/tests/test_landing_attribution_migration.py`
- Modify: `russian-diagnostic/backend/app/models.py`
- Modify: `russian-diagnostic/backend/app/routers/marketing.py`
- Modify: `russian-diagnostic/backend/app/services/marketing_attribution.py`
- Modify: `russian-diagnostic/backend/app/services/game_analytics.py`
- Modify: `russian-diagnostic/backend/tests/test_marketing_attribution.py`
- Modify: `russian-diagnostic/backend/tests/test_game_analytics.py`
- Modify: `russian-diagnostic/backend/docs/marketing-click-links.md`

**Interfaces:**

- Consumes the existing `GET /api/marketing/click`, `AdClickCapture`, `capture_to_attribution_dict`, `c_<click_id>` claim, and first/latest snapshot contracts.
- Produces nullable `AdClickCapture.landing_surface` and `.landing_cta`, accepted query names of the same spelling, and canonical snapshot properties that automatically become `first_landing_*` and `latest_landing_*` analytics properties.
- Exact analytics identity keys are `first_landing_surface`, `first_landing_cta`,
  `latest_landing_surface`, and `latest_landing_cta`.
- Registry normalization accepts only surface `octopus_ai` and CTA values `hero`, `games`, `pricing`, and `final`; invalid values do not block Telegram navigation.

**TDD and deliverable boundary:**

- [ ] Demonstrate RED for additive migration upgrade/downgrade, valid dimension persistence, invalid-value normalization, legacy `NULL` compatibility, Telegram claim linkage, first/latest snapshots, and analytics property propagation.
- [ ] Implement the smallest additive schema/model/router/registry change that makes the focused contracts green without altering existing selectors or payloads.
- [ ] Keep canonical attribution projection in one source of truth; update explicit projections only where they intentionally enumerate acquisition properties.
- [ ] Update the maintained link contract with landing parameters and a concrete `funnel=learning_path` example that retains advertising `placement`.
- [ ] Verify focused migration, capture, claim/idempotency, analytics delivery, direct-link, funnel-selector, and Learning Path destination gates plus Ruff and diff checks.

**Review gate:** A fresh reviewer can reject or accept the backend slice independently. Acceptance evidence must show both new columns, unchanged short payload/destination behavior, unchanged legacy captures, and exact first/latest propagation.

---

### Stage 2: Make every landing CTA emit the complete Marketing Click URL

**Repository:** `C:\xProjects\octopus-ai-preview`

**Files:**

- Create: `octopus-landing/src/lib/marketingClick.ts`
- Create: `octopus-landing/src/lib/marketingClick.test.ts`
- Modify: `octopus-landing/src/components/TelegramCta.tsx`
- Modify: `octopus-landing/src/components/TelegramCta.test.tsx`
- Modify: `octopus-landing/tests/landing.spec.ts`
- Modify: `octopus-landing/scripts/validate-production-env.mjs`
- Modify: `octopus-landing/scripts/validate-production-env.test.mjs`
- Modify: `octopus-landing/README.md`
- Modify: `octopus-landing/RELEASE_CHECKLIST.md`

**Interfaces:**

- `buildMarketingClickHref(configuredUrl, pageSearch, placement)` owns URL construction and returns the final string consumed by `TelegramCta`.
- `configuredUrl` contributes the authoritative endpoint and product selectors; `pageSearch` contributes only the documented advertising allowlist; `placement` maps to the trusted `landing_cta` enum.
- The output always includes `landing_surface=octopus_ai`, the exact CTA, and the configured `funnel=learning_path`. Direct test Telegram handling remains isolated from the production Marketing Click path.

**TDD and deliverable boundary:**

- [ ] Demonstrate RED for all supported advertising fields, all four CTA values, preserved advertising `placement`, ignored unknown/selector/landing overrides, deterministic repeated/empty values, encoding, and direct visits without UTM values.
- [ ] Implement the focused URL builder and make `TelegramCta` delegate to it without changing visible copy, layout, CTA click pixels, or navigation semantics.
- [ ] Demonstrate RED and GREEN for production validation rejecting direct Telegram transport while the explicit safe draft/test transport still works.
- [ ] Update E2E expectations so each visible CTA proves its exact complete href rather than four identical static URLs.
- [ ] Update setup/release documentation to require Marketing Click for public builds and retain the current legal/media/consent gates.
- [ ] Verify focused Vitest contracts, collision-free Chromium/WebKit CTA E2E, TypeScript, draft build, artifact audit, and diff checks. Treat the known fixed-port `reuseExistingServer` hazard as an environment condition, not product evidence.

**Review gate:** The landing slice is independently inspectable against a stub/configured Marketing Click base. Acceptance evidence must show no arbitrary query forwarding and no loss or collision of upstream advertising dimensions.

---

### Stage 3: Prove the cross-repository chain and prepare a release decision

**Repositories:** both isolated worktrees; no production mutation.

**Interfaces:**

- Consumes the Stage 2 generated CTA URL and the Stage 1 backend capture/claim interfaces.
- Produces verification evidence for one linked capture and its identity snapshots; it does not add a third runtime or duplicate the contract in permanent infrastructure.

**Integrated evidence boundary:**

- [ ] Generate a real CTA href in the landing test runtime for an arrival containing the full supported TikTok/Instagram-style context and an advertising `placement`.
- [ ] Submit that exact generated query to the backend test application and follow the returned short payload through the existing Telegram claim/link boundary.
- [ ] Assert one capture containing unchanged acquisition values, `landing_surface=octopus_ai`, the selected `landing_cta`, `funnel_key=learning_path`, linked identity, and matching first/latest analytics snapshots.
- [ ] Repeat the boundary with no acquisition values and confirm the landing dimensions remain present while advertising fields remain absent.
- [ ] Re-run the risk-proportionate aggregate gates in both worktrees, review both diffs for scope and protected `/learning-map/` zero delta, and record exact commits and verification evidence.

**Owner decision gate:** Present the clean local candidate and evidence. A later release, if separately approved, is backend migration/capture first, backend smoke and DEV physical Telegram confirmation second, and landing publication last. PROD and public traffic remain separately gated.
