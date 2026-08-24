# Octopus AI Landing Attribution Chain Design

**Date:** 2026-08-24

**Status:** Owner-approved design, implementation pending

**Landing source:** `Shima337/octopus-ai-preview`, `origin/main@3ed7f53691fc714438f8ed4a1f979834bfc26ed7`

**Octopus source:** `HappyAIConsult/turbo-wedge`, fresh work must start from `origin/octopus-dev-recovery@84e96b1cb358cbbe545ac3ef3d567822a63f977e`

## Outcome

Preserve a visitor's original advertising attribution across the complete public journey:

```text
advertising link → Octopus AI landing → selected landing CTA
→ Octopus Marketing Click API → short c_<click_id> Telegram payload
→ Telegram identity → Learning Path → first/latest attribution and analytics
```

The chain must distinguish both where the visitor originally came from and which public
landing CTA moved them into Telegram. It must not rewrite advertising UTM values to make
the intermediate landing look like the acquisition source.

## Current state and broken boundary

The Octopus Marketing Click API already accepts and persists the complete supported
advertising context: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term`, `fbclid`, `ttclid`, `gclid`, `campaign_id`, `adset_id`, `ad_id`,
`creative_id`, and advertising `placement`. It creates `AdClickCapture`, redirects or
renders the configured Telegram handoff with a short `c_<click_id>`, binds that click to
the first Telegram user, and copies the capture into first/latest attribution snapshots.

The landing currently returns its configured Marketing Click URL unchanged. Therefore an
arrival such as `?utm_source=tiktok&utm_campaign=aug26&ttclid=...` is not copied into any
CTA URL, and all four landing CTAs are indistinguishable in the backend ledger.

## Scope

### Landing repository

- Build every Marketing Click CTA URL from the configured base URL and the current page
  attribution.
- Preserve the configured product selector `funnel=learning_path`.
- Copy only the supported advertising allowlist from the current page URL.
- Add trusted code-owned landing dimensions:
  - `landing_surface=octopus_ai`
  - `landing_cta=hero|games|pricing|final`
- Keep the existing local CTA analytics event and Meta/TikTok `Lead` call.
- Make the production release guard require the Marketing Click transport for this public
  landing. A direct `t.me` URL remains available only to explicit draft/test flows.
- Update the release documentation and CTA tests to describe the attribution contract.

### Octopus recovery backend

- Add nullable `landing_surface` and `landing_cta` columns to `ad_click_capture` in a new
  migration after the current recovery migration head `0062`.
- Add both names to the Marketing Click request allowlist and ORM model. Normalize them
  through explicit code-owned registries: the only initial surface is `octopus_ai`, and
  its CTA values are `hero`, `games`, `pricing`, and `final`. Missing values remain
  `NULL`; unknown values are omitted with a diagnostic warning rather than blocking the
  visitor's Telegram navigation.
- Add both names to the canonical attribution property list so they flow into
  `UserIdentity.first_attribution_json`, `latest_attribution_json`, PostHog identity
  properties, lead snapshots, and downstream consumers that use the canonical snapshot.
- Include the dimensions in any explicit game/event attribution projection that otherwise
  copies the canonical acquisition keys. This keeps the capture contract consistent even
  though the landing currently targets Learning Path.
- Extend the maintained Marketing Click link documentation with the two landing fields.

No new endpoint, click identity, Telegram payload format, bot route, Learning Path route,
pixel provider, cookie, browser storage, or attribution table is introduced.

## URL contract

For an arrival URL such as:

```text
https://ai.ct-bratan.by/?utm_source=tiktok&utm_medium=paid_social
  &utm_campaign=aug26&utm_content=video07&campaign_id=cmp1
  &creative_id=video07&placement=feed&ttclid=tt-123
```

the Hero CTA resolves to the semantic equivalent of:

```text
https://web.ct-bratan.by/api/marketing/click?funnel=learning_path
  &utm_source=tiktok&utm_medium=paid_social&utm_campaign=aug26
  &utm_content=video07&campaign_id=cmp1&creative_id=video07
  &placement=feed&ttclid=tt-123
  &landing_surface=octopus_ai&landing_cta=hero
```

The other CTA values are `games`, `pricing`, and `final`.

### Merge and trust rules

1. The configured Marketing Click base supplies product selectors and is authoritative for
   `funnel`; an incoming page query cannot replace it.
2. The current page supplies only the documented advertising allowlist. Unknown query
   parameters are dropped.
3. `landing_surface` and `landing_cta` are always generated from landing code. Incoming
   values with those names are ignored.
4. Empty values are omitted. Repeated parameters use their first value, matching
   `URLSearchParams.get` and the backend's existing single-value capture behavior.
5. URL encoding is delegated to `URL`/`URLSearchParams`; values are never concatenated by
   hand.
6. Advertising `placement` remains untouched. It is not reused for the landing CTA.
7. A visitor without advertising parameters still produces a valid Marketing Click URL
   with `funnel`, `landing_surface`, and `landing_cta`.

The landing is a single-page document and does not remove its arrival query while the user
reviews it. No cookie or local/session storage is needed for this slice. A later direct
visit without attribution is intentionally a direct visit rather than a resurrection of
an earlier campaign.

## Backend data flow

1. `GET /api/marketing/click` normalizes and persists both landing dimensions on the same
   `AdClickCapture` row as the original advertising values.
2. The existing transport emits the unchanged short `c_<click_id>` payload.
3. Telegram `/start` binds the capture to one Telegram user under the existing immutable
   click claim rules.
4. The existing session/bootstrap path links the capture to `UserIdentity` and
   `FunnelSession`.
5. `capture_to_attribution_dict` includes both landing dimensions. First attribution stays
   immutable; latest attribution follows the existing successful-click semantics.
6. Existing analytics delivery prefixes the snapshot properties as `first_*` and
   `latest_*`, making `first_landing_surface`, `first_landing_cta`,
   `latest_landing_surface`, and `latest_landing_cta` available without a second identity
   mechanism.

The existing `referrer` remains useful evidence of the landing origin, but it is not used
as the canonical landing dimension because cross-origin referrer policy may remove path
and query details and because it cannot identify the selected CTA.

## Failure and compatibility behavior

- Missing advertising parameters are valid; landing dimensions still identify the site
  hop.
- Malformed or unsupported page parameters are omitted rather than forwarded.
- Unknown landing dimension values sent directly to the backend are normalized to `NULL`
  and diagnosed; they never create uncontrolled analytics dimensions.
- If the configured URL is not a valid Marketing Click URL, production validation fails
  closed. Draft/test validation may continue using the explicit safe test Telegram URL.
- Existing advertising links that call the Marketing Click API directly continue to
  create rows with both new columns `NULL`.
- Existing `m_*`, `c_*`, and `gs_c_*` Telegram payloads retain their current meaning and
  length. No published direct-link registry entry changes.
- The database migration is additive and reversible; downgrade removes only the two new
  nullable columns.

## Verification evidence required

### Landing TDD

- A Marketing Click CTA initially fails to preserve every supported advertising field.
- Each of the four CTA placements produces its exact `landing_cta` value.
- Incoming `funnel`, `landing_surface`, `landing_cta`, and unknown parameters cannot
  override the configured contract.
- Advertising `placement` is preserved separately from `landing_cta`.
- A direct visit without UTM values still receives the landing dimensions.
- Encoding, empty values, and repeated query values are deterministic.
- Production validation rejects direct Telegram transport while draft validation keeps the
  safe explicit test path.
- Focused unit tests, Chromium/WebKit CTA E2E, TypeScript, draft build, and artifact audit
  pass in a collision-free test environment. The known fixed-port/reused-server Windows
  hazard must not be mistaken for product evidence.

### Backend TDD

- Migration upgrade/downgrade tests prove both nullable columns.
- Marketing Click capture persists original advertising values and the two landing values
  without collision.
- Direct legacy Marketing Click requests remain valid with `NULL` landing values.
- Telegram claim and identity linkage preserve both landing fields in first/latest
  attribution snapshots.
- Analytics delivery exposes the expected `first_*` and `latest_*` landing properties.
- Existing short-payload, funnel-selector, direct-link, claim-idempotency, and Learning
  Path destination tests remain green.

### Integrated contract check

Generate a real landing CTA URL in the landing test runtime, submit it to the backend test
application, follow the returned short Telegram payload through the existing claim/link
test boundary, and assert one capture with:

- the original UTM/click/ad values;
- original advertising `placement`;
- `landing_surface=octopus_ai`;
- the selected `landing_cta`;
- `funnel_key=learning_path`;
- linked Telegram identity and matching first/latest snapshot values.

## Release boundary

Implementation occurs in two isolated repositories. Backend schema and capture support
must be accepted and released before a landing build begins emitting the new query fields.
The landing change is backward-compatible with an older backend only in navigation, not in
complete attribution, because an older backend silently ignores the two new fields.

No deploy is part of implementation approval. A future release requires a separate owner
command and the existing Octopus backend-first DEV sequence. Production remains a separate
approval after DEV data and physical Telegram flow are verified. The public landing cannot
be opened to traffic while its existing legal, consent, media-rights, pricing, and release
checklist gates remain unresolved.

## Acceptance criteria

1. TikTok, Instagram, or other supported campaign parameters arriving on the public
   landing survive unchanged into the linked Telegram user's attribution.
2. Every linked capture identifies the public landing and exact CTA independently of the
   advertising placement.
3. The user still opens the existing Learning Path route through the existing Marketing
   Click and Telegram contracts.
4. Direct legacy Marketing Click and Telegram links remain behaviorally unchanged.
5. No arbitrary page query parameter, product selector override, secret, or sensitive
   value is introduced into the attribution chain.
6. Both repositories pass their focused and risk-proportionate verification gates from
   clean isolated worktrees.
