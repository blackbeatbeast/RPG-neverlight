# 010 — Harden identity, recovery, operations, and economy for closed alpha

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `security-and-abuse-guardian`, `test-and-verification-engineer`, `free-tier-ops-guardian`, `game-data-and-migrations`

## Objective

Make the first playable resilient enough for invited players: account upgrade/recovery, backups, reconciliation, admin tools, rate/cost abuse tests, and accessibility/performance audit.

## In scope

- Email/passkey or approved account-link flow, session/device management, export/delete design.
- Backup/export and restoration rehearsal; migration recovery.
- Ledger reconciliation/admin inspection/write freeze.
- Threat model, abuse suite, dependency/security review.
- Accessibility and performance budgets; closed-alpha runbook.

## Out of scope

- Open registration at scale
- Market, real-time chat, monetization
- Automated punitive moderation

## Acceptance criteria

- Account link does not lose or duplicate guest progress.
- Backup restoration and ledger reconciliation are demonstrated.
- Owner can freeze writes and enter maintenance mode.
- High-risk threat cases have tests/controls or explicit accepted risks.
- 360/1280, keyboard, reduced motion, and bandwidth budgets pass.

## Verification

Run and record the exact output/result of:

- `pnpm test`
- `pnpm test:e2e`
- `pnpm security:test`
- `pnpm ledger:reconcile`
- `restore rehearsal log`
- `accessibility/performance report`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Recovery requires storing sensitive data without a privacy plan.
- A critical duplication/auth issue remains open.

Do not begin the next backlog packet in the same PR.
