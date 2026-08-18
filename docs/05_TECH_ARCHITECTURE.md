# 05 — Technical architecture

## 1. Goals

- current PC and smartphone browsers;
- low bandwidth and static-first rendering;
- no always-on paid server for early testing;
- server-authoritative deterministic game rules;
- safe migrations, observability, and cost kill switches;
- architecture that can add trade/ads/supporter entitlements later without coupling them to combat.

## 2. Proposed stack

| Layer | Proposal | Reason |
|---|---|---|
| Web UI | React + Vite + TypeScript | mature responsive UI, simple static build |
| API/edge | Hono on Cloudflare Workers | lightweight routing, edge deployment, one language |
| Rules | pure TypeScript package | deterministic tests shared by API/tools |
| Database | Cloudflare D1 (SQLite semantics) | serverless, migrations, free-first prototype |
| Assets | bundled static assets first; R2 later | avoid storage complexity until needed |
| Validation | Zod or equivalent | shared content/API schema boundaries |
| Unit tests | Vitest | fast deterministic rule tests |
| Worker tests | Cloudflare Vitest integration | bindings/runtime behavior |
| E2E | Playwright | phone/desktop and keyboard flows |
| Package manager | pnpm workspaces | explicit monorepo dependency boundaries |
| CI | GitHub Actions | blueprint, type, test, build, migration checks |

Dependencies are proposals. The bootstrap PR must pin versions and record any change in an ADR.

## 3. Logical components

```text
Browser
  ├─ semantic UI + local presentation preferences
  ├─ session-safe API client
  └─ no authoritative game mutation logic
        ↓ HTTPS
Cloudflare Worker (Hono)
  ├─ auth/session/CSRF
  ├─ rate and cost gates
  ├─ API validation
  ├─ application services
  ├─ game-core deterministic resolution
  ├─ ledger/idempotency
  └─ D1 repositories / R2 asset references
        ↓
D1
  ├─ identity and player state
  ├─ content version pointers
  ├─ encounters and combat logs
  ├─ item/card instances
  ├─ economy ledger
  ├─ social/moderation data
  └─ feature flags / operational state
```

## 4. Package boundaries

### `apps/web`
Rendering, routing, forms, accessibility, optimistic *display* only. It may calculate previews but labels them non-authoritative.

### `apps/worker`
HTTP boundary, auth, rate limits, transaction orchestration, idempotency, repositories, operational flags, response shaping.

### `packages/game-core`
Pure functions: command validation, combat resolution, seeded RNG, drops, affix generation, derived stats, salvage/crafting calculations. No network, filesystem, database, wall clock, environment variables, or global randomness.

### `packages/content-schema`
Versioned schemas for enemies, items, affixes, cards, characters, routes, dialogue, recipes, and content bundles.

### `packages/db`
Migrations, typed repositories, transaction helpers, ledger writer, test fixtures. No UI.

### `packages/ui`
Semantic components and retro/modern themes. No game economy logic.

## 5. API principles

- `/api/v1/...` versioned endpoints.
- Cookie session with secure/httpOnly/sameSite settings or an equally reviewed strategy.
- CSRF protection for cookie-authenticated mutations.
- All writes require `Idempotency-Key` and an expected state/version where applicable.
- Errors use stable machine codes plus safe user messages.
- Responses include ruleset/content version when relevant.
- Pagination is cursor-based for mutable feeds/market data.
- No endpoint accepts final damage, reward, item stats, price settlement, or ownership claims from the client.

Example vertical slice:

```text
POST /api/v1/routes/:routeId/explore
  input: expectedRouteVersion, selectedNode, idempotency key
  server: validate → reserve action → seed → resolve event → ledger → persist
  output: new route state, renderable events, authoritative version
```

## 6. Identity stages

1. Local guest with server-issued opaque session; one-click start.
2. Upgrade/link to email or passkey before valuable social/trade features.
3. Account recovery and device/session management before public alpha.
4. Step-up verification for market, moderation-sensitive actions, and account export/deletion.

Do not require third-party social login for basic play.

## 7. Data and transaction model

D1 is authoritative. Economy mutations run in a transaction boundary where supported and use:

- idempotency record;
- state/version precondition;
- append-only ledger events;
- materialized/current state update;
- audit metadata;
- response snapshot tied to the idempotency result.

Retries return the original result, never repeat mint/consume operations.

## 8. Content deployment

Content bundles have:

- schema version;
- content version;
- compatibility range with engine ruleset;
- checksums;
- activation status and timestamp;
- provenance/manifests for assets;
- validation and simulation report.

A bad content bundle can be deactivated without rolling back application code.

## 9. Cost-aware operations

Use free tiers as an engineering constraint, not a guarantee of zero cost forever.

- cache public content/version manifests;
- avoid per-render database reads when state can be fetched once;
- batch logs/telemetry conservatively;
- cap expensive list/search endpoints;
- rate-limit exploration and posting;
- disable asset upload and real-time features initially;
- define daily request/write budgets and alert thresholds;
- operational modes: normal → degraded → read-only → maintenance;
- owner approval required before binding a paid service or raising hard limits.

## 10. Observability

Minimum event fields: request ID, account pseudonymous ID, action class, idempotency key hash, ruleset/content version, latency, D1 read/write counts where available, result code, cost bucket. Never log raw secrets, full session tokens, private messages, or unnecessary personal data.

Game-economy dashboards track mint/burn, item sources/sinks, rare-drop distribution, failed/retried mutations, and suspicious transfer graphs once market exists.

## 11. Deployment environments

- local: Miniflare/Wrangler + local D1;
- preview: per-PR Worker/environment with non-production data and hard caps;
- staging: migration rehearsal and content activation tests;
- production: protected deployment, manual approval initially, backups/export plan.

No preview may connect to production D1 or production secrets.

## 12. Disaster and rollback

- migration backup/export before irreversible operations;
- content activation independently reversible;
- feature flags and global write freeze;
- ledger reconciliation tooling;
- deterministic combat log replay;
- documented restoration test before public alpha.
