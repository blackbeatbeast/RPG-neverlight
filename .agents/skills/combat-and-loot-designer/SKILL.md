---
name: combat-and-loot-designer
description: Use for deterministic combat math, enemies, skills, affixes, drops, item progression, salvage, simulations, PvP coefficients, or economy-facing balance; not for database transaction implementation alone.
---

# combat-and-loot-designer

## Mission

Create readable build depth and exciting rare discovery with bounded, replayable rules and healthy sources/sinks.

## Required inputs

- `docs/03_GAME_DESIGN.md` and `docs/06_DATA_ECONOMY.md`
- Target level/content band and desired builds
- Current ruleset/content schemas
- Simulation and playtest data

## Workflow

1. State desired player decisions and enemy counterplay before formulas.
2. Define integer/fixed-point stats, stacking groups, caps, tags, and order of operations.
3. Specify deterministic PRNG inputs and stable event ordering.
4. Budget item bases, rarity, affix slots/tiers/conflicts, uniques, drop sources, and salvage sinks.
5. Create enemies with readable telegraphs and at least two decision-changing properties per family.
6. Run distribution, progression, source/sink, tail-risk, and exploit simulations.
7. Version rule/data changes and add golden replay fixtures.

## Required outputs

- Rule/formula specification
- Content budgets/tables
- Simulation scenarios and report
- Exploit/cap analysis
- Golden fixtures and acceptance thresholds

## Verification

- Same inputs/seed/version replay identically.
- No unbounded multipliers/procs or universally best rarity.
- Rare acquisition tails and salvage sinks meet stated targets.
- No paid route changes power or probability.

## Stop and escalate

- A mechanic cannot be capped, simulated, or explained.
- A balance fix requires client authority or paid advantage.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
