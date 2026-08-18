# 01 — Historical reference and translation rules

## Naming correction

The researched game is **ネバーワールドオンライン / Neverworld Online**, not the separate **ワールドネバーランド / World Neverland** series. The public project must not use either name or imply authorization, continuity, or compatibility.

## Evidence-based reference traits

Public contemporary sources describe these traits:

- service began in 2004 and later reached multiple Japanese mobile carriers;
- the same world supported players across carriers;
- normal movement and interaction used command selection rather than a continuously rendered field;
- exploration commands triggered monsters or other players;
- combat was turn-based, with an option to prepare three turns;
- text/community systems included free-form communication and bulletin boards;
- crafting, auctions, item collection books, types/classes, skills, and private dungeons were part of the broader game;
- the world blended fantasy with restrained near-modern science-fiction imagery;
- simple repetition was approachable but could become tactically shallow.

Sources and access dates are recorded in `docs/SOURCES.md`.

## Preserve principles, not expression

| Historical principle to study | Original Project Neverlight expression |
|---|---|
| Command-oriented mobile play | Semantic numbered command deck with touch and keyboard shortcuts |
| Text/AVG-like presentation | Original illustrated scene cards and compact prose |
| Exploration-triggered encounters | Server-resolved route nodes and encounter tables |
| Three-turn preparation | 1–3 command queue with readable intent and counterplay |
| Cross-device shared world | One web account across phone/PC; async world events |
| Collection books | Item, enemy, location, and Memory Card codices |
| Crafting and auction | Original salvage/crafting; escrow market only after alpha |
| Type/class growth | License/discipline tracks with build tradeoffs |
| Fantasy + near-modern SF | Original “relic infrastructure” setting and terminology |
| Easy repeated hunting | Fast replay plus enemy tags, breakpoints, and loot decisions |

## Explicitly prohibited copying

Do not copy or trace:

- title, logo, character names, faction names, place names, item names, dialogue, story events;
- screenshots, sprites, backgrounds, icons, fonts, sounds, promotional art, layouts, color palettes as a set;
- exact maps, encounter tables, formulas, item statistics, rarity tables, skill lists, database structures;
- source code, traffic captures, private-server data, leaked material, or reverse-engineered proprietary content;
- marketing claims that imply “revival,” “official successor,” or source-owner endorsement.

## Reference-site handling

`majingai.com` may be used only to discuss broad interaction qualities such as compact browser screens, visible image-and-text hierarchy, low-animation pacing, and repeatable command loops. Do not clone its pages or CSS. Any visual study must become a written abstraction before implementation; Codex must work from the abstraction, not a screenshot.

## Design upgrade mandate

Nostalgia is not permission to repeat old friction. Keep the cadence and density, but modernize:

- responsive layout and account portability;
- accessible controls and readable status changes;
- clear probabilities/telegraphs where appropriate;
- inventory filters, compare, bulk salvage, and undo where safe;
- anti-duplication ledgers and idempotent mutations;
- moderation, reporting, privacy, and cost controls;
- meaningful enemy differences so “press attack forever” is not the only answer.
