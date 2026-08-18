# 10 — Roadmap and release gates

## Phase 0 — Blueprint (this repository state)

Deliverables:

- product, game, UX, technical, legal, content, and economy specifications;
- ADRs and product constraints;
- Codex Skills;
- issue-ready sequenced backlog;
- validation and GitHub publication scripts.

Exit: blueprint validation passes and owner accepts the core direction.

## Phase 1 — Walking skeleton

- pnpm monorepo, strict TypeScript;
- React/Vite semantic shell with retro/modern themes;
- Hono Worker and local D1;
- deterministic game-core fixture;
- content-schema example;
- CI, preview deployment, maintenance mode.

Exit: one fake encounter works end-to-end with no persistent economy.

## Phase 2 — First playable vertical slice

- guest/player state;
- one town and route graph;
- deterministic combat, enemy telegraphs, 1–3 command queue;
- item instances, loot, inventory/equipment, salvage;
- codex and four adult characters;
- first region and boss;
- phone/PC accessibility checks.

Exit: 30-minute closed playtest with no manual database edits.

## Phase 3 — Closed alpha hardening

- account linking/recovery;
- content bundle activation and rollback;
- economy ledger/reconciliation/admin view;
- abuse/rate/cost controls;
- moderation foundations;
- telemetry and balance simulation;
- backup/restore rehearsal.

Exit: invite alpha can run within approved zero/near-zero budget and survive retries/abuse tests.

## Phase 4 — Collection and asynchronous community

- Memory Cards and card board;
- crafting/recipes;
- discovery feed, BBS, guilds;
- block/mute/report and moderator tools;
- seasonal content pipeline.

Exit: social safety review and retention test.

## Phase 5 — Economy expansion (optional)

- escrow market, binding, fees, provenance views;
- anti-RMT, price/volume controls, reversal tooling;
- opt-in asynchronous PvP after separate balance review.

Exit: simulation and adversarial testing pass; owner explicitly enables flags.

## Phase 6 — Public alpha and sustainability

- name/IP/legal launch review;
- privacy/terms/community docs;
- capacity/read-only operations;
- public content presentation review;
- optionally evaluate supporter features or ads, still disabled by default.

## “Not before” dependencies

| Feature | Not before |
|---|---|
| Rare cards | deterministic loot + duplicate sink + content validation |
| BBS/guilds | report/block/mute + rate limits + moderator audit |
| Market/trade | ledger + provenance + reconciliation + simulation + recovery |
| PvP | stable PvE rules + separate coefficients + anti-collusion |
| Suggestive variants | general asset complete + age/provenance/content review |
| Ads | privacy/consent + policy review + general-only placement capability |
| Supporter shop | entitlement isolation + processor/legal/refund design |
