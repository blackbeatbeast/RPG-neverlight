# 014 — Prototype opt-in asynchronous PvP

- Status: Ready for issue
- Phase: Expansion / gated
- Required Skills: `combat-and-loot-designer`, `security-and-abuse-guardian`, `test-and-verification-engineer`, `product-vision-keeper`

## Objective

Evaluate an opt-in asynchronous challenge mode using deterministic snapshots, separate coefficients, bounded rewards, and anti-collusion controls.

## In scope

- Challenge snapshots/decks, deterministic resolution, level/build bands.
- Separate PvP coefficients and disabled-by-default flag.
- Weekly reward caps, repeat-opponent/collusion limits, logs, reporting.
- No loss of irreplaceable items or forced participation.

## Out of scope

- Real-time duels
- Open-world attacks
- Uncapped leaderboard rewards
- Tradeable rare rewards

## Acceptance criteria

- PvE balance is not changed to solve PvP.
- Resolution is replayable and protected from client tampering.
- Opt-out players receive no penalty.
- Collusion simulation and repeat limits work.
- Rewards cannot dominate PvE progression/economy.

## Verification

Run and record the exact output/result of:

- `pnpm pvp:simulate -- --scenarios all`
- `pnpm test --filter game-core`
- `pnpm security:test -- --suite pvp`
- `manual opt-in/out UX review`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Mode harms the quiet async product pillar.
- Rewards create farmable transfer value.

Do not begin the next backlog packet in the same PR.
