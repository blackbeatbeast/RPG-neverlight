# 003 — Establish versioned content schemas and validation

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `content-pipeline-editor`, `character-content-director`, `clean-room-ip-guardian`, `test-and-verification-engineer`

## Objective

Turn example content into strict versioned definitions with cross-reference, age, provenance, route, and balance validations.

## In scope

- Schemas for characters, assets, zones/routes/nodes, enemies, commands, items, affixes, cards, recipes, codex text, and bundles.
- Stable ID conventions, localization keys, content/ruleset compatibility, checksums.
- Validation for age >=20, general fallback, provenance, alt text, reference integrity, route reachability, affix conflicts/budgets, and drop-table math.
- CLI that validates example bundles and emits a human-readable report.

## Out of scope

- Final production content
- Live content editor
- AI-generated runtime content
- Database activation

## Acceptance criteria

- Valid examples pass; targeted invalid fixtures fail with actionable paths/messages.
- Every depicted named character requires explicit adult age.
- Optional suggestive assets require general fallback and review metadata.
- IDs/references and route reachability are deterministic.
- The validator produces a bundle checksum.

## Verification

Run and record the exact output/result of:

- `pnpm content:validate`
- `pnpm test --filter content-schema`
- `pnpm typecheck`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- A schema stores copied source-game names/data.
- A content request cannot document rights/provenance.

Do not begin the next backlog packet in the same PR.
