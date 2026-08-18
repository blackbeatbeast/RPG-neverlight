# 15 — Owner requirements traceability

This matrix connects the original project request to design decisions and executable work. “Covered” means the blueprint contains an implementation path; it does not mean the feature is already coded.

| Owner requirement | Blueprint response | Primary specs | Backlog |
|---|---|---|---|
| Revive the beloved game’s core feeling | Clean-room spiritual successor preserving command/text/static-image principles | 00, 01, 02; ADR 0001 | all, especially 005–008 |
| Play from current PC and smartphone | Responsive web client, one account, 360/1280 targets | 04, 05 | 001, 002, 004, 009 |
| Nostalgic image/text browser progression | Still-first scene pages, short prose, numbered links, no mandatory animation | 02, 03, 04; ADR 0003 | 002, 006, 008 |
| Keep old UI flavor but improve usability | One semantic UI with retro/modern themes, filters, compare, keyboard, accessibility | 04; ADR 0006 | 002, 007, 010 |
| Modern cute women with personality | Four original adult characters with jobs, motives, mechanical roles, relationships | 02, 07, 13 | 003, 008 |
| Light R-15 allure | Adult-only, non-explicit, optional presentation, general fallback, no stat difference | 07; ADR 0007 | 003, 008, 015 |
| “Pochi-pochi” simple play | 60-second/5-minute loops, repeat plan with safety stops, 1–3 queued commands | 03 | 005, 006 |
| Make repetition more interesting | Enemy telegraphs/tags, build choices, bounded affixes, route risk/reward | 03, 06 | 005, 007, 008 |
| Hack-and-slash | Item instances, rarity, quality, affixes, uniques, relics, salvage, codex | 03, 06 | 007 |
| Rare cards | Earned Memory Cards, board effects, duplicate-to-Ink sink, no paid gacha | 03, 06; ADR 0005 | 011 |
| Light trade | Delayed escrow market, binding/provenance, fees, anti-RMT, off by default | 03, 06 | 013 |
| Social/shared world | Async echoes first, then BBS/guilds with moderation | 03 | 006, 012 |
| Everyone can play without initial cost | Cloudflare/GitHub free-first architecture, hard budgets and degradation | 05, 16; ADR 0002 | 001, 009, 010 |
| Preserve future ad/revenue options | Isolated dormant entitlement/ad seams, all flags false, no pay-to-win | 09; ADR 0005 | 015 |
| Put the specification framework on GitHub | Repo-ready docs, AGENTS.md, 18 Skills, issue packets, CI, publish scripts | README, CODEX_START_HERE, 11, 14 | 001–015 |
| Have Codex perform development | Repo-scoped Skills and sequenced verification pauses | CODEX_START_HERE, 11, Skills catalog | each packet names Skills |
| Respect the original deeply | Cited historical study, preserve principles, prohibit copied expression | 01, 08, SOURCES | historical-game-researcher + clean-room-ip-guardian |

## Intentionally deferred rather than forgotten

- actual public name and trademark clearance;
- final production art and asset contracts;
- account provider choice;
- public moderation staffing;
- market/PvP enablement;
- ad/payment provider choice;
- legal terms, privacy policy, and formal content rating;
- exact live balance numbers after playtests.
