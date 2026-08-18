# 006 — Implement the exploration-to-combat API vertical slice

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `browser-rpg-loop-designer`, `cloudflare-fullstack-engineer`, `game-data-and-migrations`, `security-and-abuse-guardian`

## Objective

Connect route graphs, server-selected encounters, persisted route runs, combat resolution, and safe browser navigation into one end-to-end slice.

## In scope

- Start route, choose node/command, create encounter, submit 1–3 combat commands, render result, continue/exit.
- Persist route/encounter versions, seeds, hashes, and idempotency results.
- POST/redirect/GET-safe behavior; browser refresh/back never repeats a mutation.
- Route expiry/recovery semantics and maintenance/read-only responses.

## Out of scope

- Real loot items
- Multiple zones
- Dungeon map UI
- Social echoes

## Acceptance criteria

- A guest can complete a fixture route on phone and desktop.
- Double taps/retries return original results.
- Closing/reopening resumes at a valid state.
- Client-submitted seeds/results are ignored/rejected.
- Read-only mode blocks writes with a clear non-destructive screen.

## Verification

Run and record the exact output/result of:

- `pnpm db:migrate:local`
- `pnpm test --filter worker`
- `pnpm test:e2e -- --grep vertical-slice`
- `fault-injection retry/back/refresh transcript`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- The flow relies on local-only authoritative state.
- A route can become unrecoverably wedged without admin repair.

Do not begin the next backlog packet in the same PR.
