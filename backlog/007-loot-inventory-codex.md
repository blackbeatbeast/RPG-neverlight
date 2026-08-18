# 007 — Implement loot, inventory, equipment, salvage, and codex

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `combat-and-loot-designer`, `game-data-and-migrations`, `retro-modern-ui-designer`, `test-and-verification-engineer`

## Objective

Add server-minted item instances with bounded affixes/provenance, safe inventory decisions, equipment-derived stats, salvage, and collection progress.

## In scope

- Drop resolution from server seed/content version; item IDs, rolls, provenance, bind/lock state.
- Atomic inventory/vault/equip/unequip/salvage operations with ledger events.
- Compare/filter/sort/favorite/lock/bulk salvage UX.
- Codex unlocks for item bases, affixes, uniques, enemies, and locations.
- Drop/source/sink simulation report.

## Out of scope

- Player trade
- Reroll monetization
- Memory Cards
- Final content volume

## Acceptance criteria

- Every minted/consumed item reconciles to ledger events.
- Retry/back cannot duplicate a drop or salvage result.
- Rare/unique/locked items require explicit confirmation and protections.
- Derived stats are computed authoritatively and explained in UI.
- 10k+ simulated runs stay within declared affix/drop bounds.

## Verification

Run and record the exact output/result of:

- `pnpm test --filter game-core`
- `pnpm test --filter db`
- `pnpm economy:simulate -- --runs 100000`
- `pnpm test:e2e -- --grep inventory`
- `pnpm ledger:reconcile -- --fixture all`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- A drop table/affix lacks an explicit budget or cap.
- Inventory design requires paid slots or power.

Do not begin the next backlog packet in the same PR.
