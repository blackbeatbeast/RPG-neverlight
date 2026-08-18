# 005 — Implement deterministic turn combat and command queues

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `browser-rpg-loop-designer`, `combat-and-loot-designer`, `test-and-verification-engineer`, `security-and-abuse-guardian`

## Objective

Implement a pure replayable combat engine with 1–3 queued commands, enemy telegraphs, statuses, caps, and structured render events.

## In scope

- Stable seeded PRNG; integer/fixed-point calculations.
- Combat state, commands, validation, targeting, priority, damage, guard, focus, statuses, cooldowns, flee, victory/defeat.
- Enemy behavior plans and readable telegraphs.
- Ruleset versioning, input/output hashes, event log.
- Golden fixtures, property/fuzz tests, and replay tool.

## Out of scope

- Persistence/API orchestration
- Loot minting
- PvP
- Final balance

## Acceptance criteria

- Same seed/state/commands/ruleset produce byte-stable normalized events and state.
- No `Math.random`, wall clock, network, filesystem, or database use in game-core.
- Invalid/over-cost/cooldown commands fail predictably.
- At least three enemy patterns make different choices correct.
- Caps prevent recursive/unbounded proc loops.

## Verification

Run and record the exact output/result of:

- `pnpm test --filter game-core`
- `pnpm combat:replay fixtures/combat/*.json`
- `pnpm combat:simulate -- --runs 10000`
- `pnpm lint && pnpm typecheck`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- A rule depends on client timing.
- A proposed formula cannot be simulated or bounded.

Do not begin the next backlog packet in the same PR.
