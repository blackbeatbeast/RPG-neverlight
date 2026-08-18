# 009 — Deploy a capped Cloudflare preview environment

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `cloudflare-fullstack-engineer`, `free-tier-ops-guardian`, `security-and-abuse-guardian`, `test-and-verification-engineer`

## Objective

Create safe preview deployment, isolated D1, secret handling, usage budgets, and normal/degraded/read-only/maintenance modes without enabling paid resources.

## In scope

- Wrangler environments, preview D1/migrations, GitHub deployment workflow with protected secrets.
- Request/write/storage budgets, rate limits, endpoint caps, caching, and operational mode controls.
- Health/readiness/version endpoint and minimal privacy-safe observability.
- Preview data reset; never connect preview to production.

## Out of scope

- Production launch
- Custom paid domain/services
- R2 unless justified and approved
- High-volume telemetry

## Acceptance criteria

- Preview deploy succeeds from reviewed branch and is isolated.
- Artificial budget thresholds trigger graceful degraded/read-only modes.
- Secrets do not appear in logs/artifacts/client bundle.
- Abuse test cannot create unbounded DB writes.
- Documented dashboard/checklist shows current free-tier assumptions and recheck date.

## Verification

Run and record the exact output/result of:

- `pnpm deploy:preview`
- `pnpm smoke:preview`
- `pnpm test:abuse -- --target preview-safe-suite`
- `manual secret/log inspection`
- `cost budget drill transcript`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Deployment asks for a paid resource or billing increase.
- Preview cannot be isolated from production data.

Do not begin the next backlog packet in the same PR.
