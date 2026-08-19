# 18 — Capped Cloudflare preview operations

> Status: internal preview only. Recheck provider limits and billing behavior on 2026-08-20 and before every invite/public-alpha gate.

This runbook defines the smallest safe Cloudflare preview for Project Neverlight. It is deliberately
manual, protected, isolated from production, and free-first. It does not authorize a paid resource,
a billing change, a public launch, or an automatic deployment from an unreviewed pull request.

## Separation and provisioning

- Local development uses `neverlight-local` in Wrangler's local state.
- Preview uses `neverlight-preview` and a separately provisioned remote D1 UUID.
- Production identifiers are not committed and are rejected by `scripts/deploy-preview.mjs` when the
  same value is supplied as `PRODUCTION_D1_DATABASE_ID` or `PRODUCTION_WORKER_NAME`.
- `apps/worker/wrangler.jsonc` keeps the preview binding under `env.preview`; the deploy script
  substitutes the isolated UUID into a short-lived ignored config file and removes that file after
  Wrangler exits.
- Preview has no production secrets, no user-uploaded assets, no R2 binding, no paid domain, and no
  automatic PR deployment.

Provisioning is a human-only step and must be stopped if Cloudflare asks for billing or a paid plan:

```bash
wrangler whoami
wrangler d1 create neverlight-preview --use-remote
```

Record the returned non-production UUID only in the protected GitHub `preview` environment variable
`PREVIEW_D1_DATABASE_ID`. Store `CLOUDFLARE_API_TOKEN` and, if required by the account, the account
identifier only as protected GitHub secrets. Do not paste either value into this repository, a PR,
the browser bundle, a command transcript, or an artifact.

The checked-in preview workflow is `workflow_dispatch`-only. Its environment must provide:

| Name                     | Location                    | Purpose                         |
| ------------------------ | --------------------------- | ------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | GitHub environment secret   | Wrangler deploy authentication  |
| `CLOUDFLARE_ACCOUNT_ID`  | GitHub environment secret   | Account scoping, if required    |
| `PREVIEW_D1_DATABASE_ID` | GitHub environment variable | Isolated preview D1 UUID        |
| `PREVIEW_URL`            | GitHub environment variable | Deployed preview smoke-test URL |

The `preview` environment should require owner approval and should not be available to forked pull
requests.

## Commands and expected boundaries

Local, isolated preview simulation:

```bash
pnpm --filter @neverlight/worker run dev:preview
$env:PREVIEW_URL = 'http://127.0.0.1:8788'
pnpm smoke:preview
pnpm test:abuse -- --target preview-safe-suite
pnpm --filter @neverlight/worker run budget:drill
```

The local command applies migrations to `.wrangler/preview-state`, never to a remote D1 database.
Stop the local Worker before removing that exact directory to reset local preview data.

Safe deploy-plan validation, with no upload:

```bash
pnpm deploy:preview -- --dry-run
```

Approved remote deployment and post-deploy checks:

```bash
pnpm deploy:preview
PREVIEW_URL=https://<protected-preview-host> pnpm smoke:preview
PREVIEW_URL=https://<protected-preview-host> pnpm test:abuse -- --target preview-safe-suite
```

On Windows PowerShell, use `$env:PREVIEW_URL = 'https://<protected-preview-host>'` for the two
checks. In CI, the checks refuse to fall back to localhost when `PREVIEW_URL` is missing.

The deployment wrapper logs only action, environment, worker name, and the statement that D1 is
isolated. Wrangler's output must be inspected for accidental secret or production identifiers before
the deployment is accepted.

## Operating modes and budget drill

The Worker has four explicit modes:

1. **normal** — approved reads and authoritative mutations are available.
2. **degraded** — the core loop remains available while low-priority work can be reduced by callers.
3. **read-only** — safe reads remain available; value-changing writes return a bounded `503` with
   `READ_ONLY` and `Retry-After`.
4. **maintenance** — only `/api/health` and `/api/v1/operations` remain available; other API paths
   return `503 MAINTENANCE` with `Retry-After`.

`OPERATION_MODE`, `READ_ONLY`, and `MAINTENANCE` can force a mode. Otherwise the per-isolate fast
kill switch observes API request/write counts in a rolling window. Preview defaults are deliberately
below the provider ceiling:

| Counter  |                                                      Preview threshold |
| -------- | ---------------------------------------------------------------------: |
| Window   |                                                         86,400 seconds |
| Requests | 50,000 hard application limit; degraded at 32,500; read-only at 40,000 |
| Writes   | 40,000 hard application limit; degraded at 28,000; read-only at 36,000 |

`pnpm --filter @neverlight/worker run budget:drill` is the deterministic transcript for normal →
degraded → read-only transitions. The counters are intentionally a local/per-isolate safety valve;
Cloudflare analytics and D1/provider dashboards remain authoritative for account-wide totals. The
existing per-IP/action D1 rate limit and idempotency checks remain in force, so a client cannot turn
the preview into an unbounded write loop by bypassing the application mode endpoint.

## Free-tier and cost assumptions

The planning snapshot in [`docs/16_FREE_TIER_BUDGET.md`](16_FREE_TIER_BUDGET.md) was checked on
2026-08-19 and intentionally leaves headroom. Recheck the provider before use because limits and
billing behavior can change:

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) — the
  current planning ceiling and request/CPU constraints.
- [Cloudflare D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/) — quota exhaustion and
  query/index behavior.
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) and
  [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/) —
  environment and binding semantics.
- [D1 environments](https://developers.cloudflare.com/d1/configuration/environments/) — local,
  preview, and production separation guidance.
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) — verify the
  account plan and billing implications before remote provisioning.

There is no high-volume telemetry, R2 upload path, custom paid domain, larger runner, or billing
change in this packet. If quota exhaustion behavior, a D1 binding, or a proposed observability tool
would create a paid resource, stop and escalate to the owner.

## Secret, log, and bundle inspection

Run these checks from a clean checkout before accepting a preview deployment:

```bash
git ls-files .dev.vars .env .env.*
rg -n "CLOUDFLARE_API_TOKEN|CF_API_TOKEN|PREVIEW_D1_DATABASE_ID" apps/web/dist
rg -n "CLOUDFLARE_API_TOKEN|CF_API_TOKEN|PREVIEW_D1_DATABASE_ID" .github apps/worker scripts
```

The first command must be empty. The browser-bundle search must be empty. Source/config matches
must be limited to variable names, validation, and documentation; no secret value is allowed. The
deploy script must not receive a `--secrets-file`, and request logs must contain request IDs, action
names, and coarse outcomes only. Never include cookies, tokens, D1 UUIDs, full request bodies, or
account identifiers in uploaded evidence.

## Migration and recovery

- Preview migrations are append-only and run against the named isolated D1 only.
- `pnpm --filter @neverlight/worker run db:migrate:preview` is the explicit migration command.
- Local reset is limited to the exact Worker directory `.wrangler/preview-state` after stopping the
  local process; it does not reset remote preview data.
- A failed deploy is not success. Inspect the generated Wrangler output, confirm the target name and
  D1 binding, and rerun only after the cause is understood.
- A preview data reset or deletion requires an owner-approved, authenticated human operation outside
  this code change.

## Acceptance matrix

| Acceptance                    | Evidence                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Isolated preview deploy       | Protected manual workflow, isolated D1 UUID, deployment transcript and target review |
| Graceful budget modes         | `budget:drill` plus Worker integration tests and `/api/v1/operations` response       |
| No secret leakage             | Clean-checkout commands above, workflow environment scoping, bundle/log inspection   |
| Bounded abuse writes          | `test:abuse -- --target preview-safe-suite` and existing per-IP/action cap           |
| Current free-tier assumptions | `docs/16_FREE_TIER_BUDGET.md`, this runbook, official links, recheck date            |

## Impact review

- **Security/privacy:** no production binding, no client secret, bounded writes, request IDs without
  sensitive payloads, and explicit maintenance/read-only responses.
- **Accessibility:** operational mode is exposed as text and status data; the existing web shell
  retains its keyboard, reduced-motion, zoom, and images-disabled checks.
- **Content/IP:** no new character or asset content; the clean-room and adult-only constraints remain
  unchanged.
- **Economy:** no new currency or value source; preview mode can stop authoritative mutations safely.
- **Cost:** no paid resource or billing change; provider ceilings are planning inputs, not guarantees.

## Current limitation

Remote deployment requires an authenticated Cloudflare account and a human-provisioned preview D1.
An unauthenticated local environment may verify the dry-run, local isolated Worker, smoke check, abuse
suite, and budget drill, but it must not claim that the remote deployment succeeded. Record the exact
authentication error in the PR and finish the protected workflow once the owner supplies the external
authority.
