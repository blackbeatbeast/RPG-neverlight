# 008 — Author and integrate the first region and adult cast

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `character-content-director`, `content-pipeline-editor`, `clean-room-ip-guardian`, `browser-rpg-loop-designer`

## Objective

Replace fixture prose with a coherent original town, one route/dungeon, boss, four adult NPCs, item family, and codex arc that demonstrates the product fantasy.

## In scope

- Original setting glossary and first-region narrative map.
- Four adult character sheets and general-audience visual briefs; optional briefs remain disabled.
- At least 12 scene nodes, 6 enemy definitions across 3 behavior families, 1 boss, 20 item bases, 20 affixes, 3 uniques, quests/dispatches/codex.
- Alt text, provenance placeholders/contracts, tone/IP/R-15 review.
- Playtest script for 5-, 20-, and 30-minute sessions.

## Out of scope

- Huge launch catalog
- Live seasonal tools
- Suggestive assets in public build
- Trade/PvP

## Acceptance criteria

- No protected names/assets/story/UI expression appear.
- Every named depicted character is 20+ with non-sexual role/goals.
- At least three viable build paths emerge from the content.
- All content validation and balance reports pass.
- First-time player reaches equipment choice within target in moderated playtest.

## Verification

Run and record the exact output/result of:

- `pnpm content:validate`
- `pnpm content:similarity-review (human checklist)`
- `pnpm economy:simulate -- --bundle first-region`
- `manual playtest notes attached`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Originality/name review is uncertain.
- Art rights or adult-age presentation cannot be documented.

Do not begin the next backlog packet in the same PR.
