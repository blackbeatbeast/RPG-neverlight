# 011 — Add Memory Cards, duplicate sinks, and crafting

- Status: Ready for issue
- Phase: Expansion / gated
- Required Skills: `card-collection-designer`, `combat-and-loot-designer`, `content-pipeline-editor`, `game-data-and-migrations`

## Objective

Add earned collectible Memory Cards and a constrained board, plus atomic recipes and duplicate/salvage sinks, without paid random acquisition.

## In scope

- Card definitions, acquisition sources, duplicate-to-Ink conversion, card board/tag effects.
- Recipe discovery, material consumption, crafting mint, and provenance.
- Card/crafting codex, UI, simulation, ledger reconciliation.
- General/suggestive asset parity schema; suggestive flag remains off unless separately approved.

## Out of scope

- Paid packs
- Card trading
- Unlimited rerolls
- Market

## Acceptance criteria

- No purchase path influences card acquisition or power.
- Duplicate conversion and crafting are idempotent/atomic.
- Board effects are bounded and deterministic.
- All cards have source hints and general assets.
- Simulation shows intended acquisition tails and sink rates.

## Verification

Run and record the exact output/result of:

- `pnpm test --filter game-core`
- `pnpm test --filter db`
- `pnpm cards:simulate -- --runs 100000`
- `pnpm ledger:reconcile -- --fixture cards-crafting`
- `pnpm test:e2e -- --grep cards`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- A design resembles paid gacha or creates unavoidable duplicate frustration.
- A card modifier bypasses combat caps.

Do not begin the next backlog packet in the same PR.
