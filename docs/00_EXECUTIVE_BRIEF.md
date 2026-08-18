# 00 — Executive brief

## Intent

Revive the *feeling* of a beloved early mobile browser RPG for current PCs and phones without making a remake. The project should preserve fast command-driven browsing, still illustrations, short text, asynchronous persistence, collection, and community while adding modern clarity, richer builds, safer trade, and an original adult cast.

## What historical research suggests is worth preserving

Contemporary reporting described the reference title as a text-based mobile MMORPG whose normal play omitted a field map: players moved, explored, fought, bought, and sold through commands. Exploration triggered encounters; combat was turn-based and could queue three turns. It also emphasized cross-carrier community, free-form messages, bulletin boards, crafting, auctions, and collection books. Those are design principles to study—not assets or exact implementations to reproduce.

## Product proposition

**“A shared-world browser hack-and-slash game that feels like opening a mysterious 2000s mobile site, but plays cleanly on a 2026 phone.”**

The smallest lovable product is one town, one explorable region, one dungeon, four adult characters, a deterministic turn loop, meaningful item affixes, a codex, crafting/salvage, and asynchronous traces from other players.

## Audience

Primary:

- adults nostalgic for feature-phone and early browser games;
- players who enjoy incremental progress, loot inspection, and short sessions;
- mobile users who prefer low-bandwidth, quiet, non-action play;
- PC players who appreciate keyboard navigation and dense inventory tooling.

Secondary:

- character collectors who want charming adult designs without explicit content;
- build-crafting and economy players once cards/trade arrive.

## Success criteria for the first public alpha

- A new player reaches the first meaningful equipment decision within 8 minutes.
- A returning player can complete a useful 60-second session.
- The same account works across phone and PC.
- The full core loop works at 360 px and by keyboard only.
- A combat result can be replayed from its seed and command log.
- No client request can mint items/currency directly.
- The first region has at least three viable build directions.
- The general-audience presentation is complete; optional suggestive art is never required.
- The service can enter read-only/maintenance mode before exceeding the approved cost ceiling.

## Non-goals for prototype/alpha

- real-time multiplayer combat;
- real-time chat;
- guild wars;
- open player-to-player trade;
- paid gacha, premium stats, energy sales, or interruptive ads;
- animation-heavy character presentation;
- procedural AI-generated live dialogue;
- user-uploaded images;
- a vast content launch.

## Recommended first release shape

Closed prototype → invite alpha → public read-only showcase/limited alpha → content season. Delay trade, PvP, and monetization until the combat and item economy survive simulation and abuse testing.

## Decision summary

| Area | Choice |
|---|---|
| IP | Original clean-room spiritual successor |
| Client | Responsive React/Vite, semantic HTML, PWA optional |
| API | Hono on Cloudflare Workers |
| Data | D1 authoritative database; R2 only when needed |
| Rules | Pure deterministic TypeScript package |
| UI | One semantic structure, retro/modern themes |
| Combat | Turn-based, 1–3 queued commands, server-resolved |
| Loot | Base item + rarity + bounded affixes + provenance |
| Cards | Earned “Memory Cards,” no paid random acquisition |
| Social | Async first: traces, BBS, guilds, reports/blocks |
| Trade | Escrow market after ledger and simulations |
| R-15 | Adult-only cast, non-explicit, opt-in presentation |
| Revenue | Architectural seam only; all flags off initially |
