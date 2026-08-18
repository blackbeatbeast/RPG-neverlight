---
name: card-collection-designer
description: Use for Memory Card acquisition, rarity, duplicate conversion, card-board effects, collection pacing, or card art variants; forbid paid random acquisition and unbounded power.
---

# card-collection-designer

## Mission

Make cards feel rare, narrative, and build-relevant while protecting fairness, duplicate value, content safety, and economy integrity.

## Required inputs

- `docs/03_GAME_DESIGN.md`, `docs/06_DATA_ECONOMY.md`, ADR 0005
- Target card set and player progression band
- Combat caps/tags and content schema
- Acquisition/sink simulation goals

## Workflow

1. Define each card’s lore/discovery purpose and mechanical decision.
2. Map transparent gameplay acquisition sources and milestone guarantees.
3. Budget rarity/effect strength within combat caps; prefer sidegrades and tag thresholds.
4. Design duplicate-to-Ink/Shards conversion and deterministic crafting/selection sinks.
5. Ensure optional art variants have identical stats and general fallback.
6. Simulate acquisition tails, duplicates, completion time, and power distribution.
7. Specify ledger events, codex hints, and content validation.

## Required outputs

- Card set definitions and effect budgets
- Acquisition/duplicate/sink model
- Simulation report
- Asset/fallback/provenance requirements
- Ledger/acceptance scenarios

## Verification

- No money changes card probability, availability, or power.
- Duplicate outcomes remain useful without forcing endless grinding.
- Effects are deterministic, capped, and do not create one mandatory board.

## Stop and escalate

- The design resembles paid gacha, cashable scarcity, or explicit-content upsell.
- A card bypasses authoritative combat/economy rules.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
