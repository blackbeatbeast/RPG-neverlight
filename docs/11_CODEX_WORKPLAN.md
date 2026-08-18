# 11 — Codex execution plan

## Operating model

Codex should work in short, reviewable vertical slices. Each slice has one backlog packet, a small Skill set, explicit acceptance criteria, and a verification pause. Never ask Codex to “build the whole game” in one run.

## Recommended command pattern

```text
Read AGENTS.md and backlog/00X-....md.
Use only these project Skills: <names>.
Restate scope, acceptance criteria, assumptions, and expected files.
Implement this packet only.
Run every verification command and report exact results.
Do not begin the next packet.
```

## Sequence

| Order | Packet | Primary result | Skills |
|---:|---|---|---|
| 1 | 001 | reproducible workspace/CI | cloudflare-fullstack-engineer, test-and-verification-engineer |
| 2 | 002 | semantic retro/modern shell | retro-modern-ui-designer, accessibility-performance-auditor |
| 3 | 003 | content schemas/examples | content-pipeline-editor, character-content-director |
| 4 | 004 | guest identity/player aggregate | cloudflare-fullstack-engineer, security-and-abuse-guardian |
| 5 | 005 | deterministic combat core | browser-rpg-loop-designer, combat-and-loot-designer, test-and-verification-engineer |
| 6 | 006 | exploration API vertical slice | browser-rpg-loop-designer, game-data-and-migrations |
| 7 | 007 | loot/inventory/codex | combat-and-loot-designer, game-data-and-migrations |
| 8 | 008 | first region and cast | character-content-director, content-pipeline-editor |
| 9 | 009 | preview and free-tier guards | cloudflare-fullstack-engineer, free-tier-ops-guardian |
| 10 | 010 | closed-alpha hardening | security-and-abuse-guardian, test-and-verification-engineer |
| 11 | 011 | cards/crafting | card-collection-designer, combat-and-loot-designer |
| 12 | 012 | BBS/guilds | social-moderation-designer, security-and-abuse-guardian |
| 13 | 013 | escrow market | trade-market-economist, game-data-and-migrations, security-and-abuse-guardian |
| 14 | 014 | opt-in PvP | combat-and-loot-designer, security-and-abuse-guardian |
| 15 | 015 | dormant revenue seams | monetization-readiness-architect, clean-room-ip-guardian |

## Verification checkpoints

After packets 1, 5, 8, 10, 12, and 13, stop for owner playtest/decision. Codex must not infer approval from silence.

## PR evidence template

- Task/issue:
- Skills used:
- Acceptance criteria result:
- Files changed:
- Commands run and output summary:
- Mobile/desktop evidence:
- Determinism/economy evidence:
- Security/abuse impact:
- Accessibility impact:
- Cost impact:
- Content/IP impact:
- Known limitations:
- Recommended next packet:

## Context management

Keep `AGENTS.md` concise enough to be loaded reliably. Put detailed domain procedures in Skills and docs. Load only relevant Skills because Codex initially indexes skill names/descriptions and progressively reads full `SKILL.md` files.
