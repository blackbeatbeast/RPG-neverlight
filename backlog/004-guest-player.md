# 004 — Implement guest identity and the player aggregate

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `cloudflare-fullstack-engineer`, `game-data-and-migrations`, `security-and-abuse-guardian`, `test-and-verification-engineer`

## Objective

Create a safe guest start and server-authoritative player aggregate that can later upgrade to a durable account.

## In scope

- Opaque secure guest session, CSRF strategy, session rotation, logout/reset.
- Player aggregate with version, initial stats, preferences, inventory location scaffolding, and feature flags.
- D1 migrations/repositories and transaction/idempotency helpers.
- GET current player and safe preference mutation endpoints.
- Rate limits and privacy-minimal logging.

## Out of scope

- Email/passkey linking
- Tradeable value
- Social posting
- Combat rewards

## Acceptance criteria

- Double-submit/retry preference mutations are idempotent.
- Client cannot choose player IDs, balances, or privileged flags.
- Session cookies meet secure production settings and safe local behavior.
- Migration applies from empty DB and repository tests pass.
- Reset/delete path for guest data is documented.

## Verification

Run and record the exact output/result of:

- `pnpm db:migrate:local`
- `pnpm test --filter db`
- `pnpm test --filter worker`
- `pnpm test:e2e -- --grep guest`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Identity choice requires a paid provider.
- Schema introduces unnecessary personal data.

Do not begin the next backlog packet in the same PR.
