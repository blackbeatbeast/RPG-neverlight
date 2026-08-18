# AGENTS.md — Project Neverlight operating rules

These instructions apply to the entire repository. A deeper `AGENTS.md` may add stricter local rules but may not weaken these constraints.

## 1. Read order before changing anything

1. `README.md`
2. `config/product-constraints.yml`
3. `docs/00_EXECUTIVE_BRIEF.md`
4. The most relevant product/technical document
5. The selected backlog packet
6. The selected Skill under `.agents/skills/`
7. Relevant ADRs under `docs/adr/`

Report contradictions before implementation. Do not silently choose a side.

## 2. Product invariants

- Preserve static-image-and-text interaction as the primary experience.
- No feature may require animation, audio, or real-time 3D to understand or complete play.
- Every primary action must work with touch, keyboard, and screen-reader semantics.
- All economy-changing actions are server-authoritative and idempotent.
- Do not introduce paid power, paid random rare rewards, or cash-to-tradeable currency.
- All named depicted characters are 20+ and visibly adult.
- Suggestive presentation is optional, non-explicit, and has a general-audience fallback.
- Never copy protected names, lore, maps, dialogue, art, icons, formulas, databases, UI layouts, or code from inspiration sources.
- Avoid a pixel-perfect recreation of any reference site. Recreate interaction principles using original composition and assets.

## 3. Change discipline

Before coding, state:

- selected backlog packet;
- files expected to change;
- acceptance criteria;
- tests/checks to run;
- assumptions and unresolved decisions.

Keep each pull request focused on one coherent acceptance boundary. Do not combine broad refactors with content or balance changes.

## 4. Architecture rules

- TypeScript strict mode; avoid `any` unless isolated and justified.
- `packages/game-core` must remain deterministic and side-effect free.
- Time, random seeds, IDs, and external services enter through explicit interfaces.
- Client input is untrusted. The server validates ownership, version, costs, cooldowns, and state transitions.
- Currency, items, cards, crafting, market, and entitlements use append-only ledger events plus derived state.
- Mutating API requests require idempotency keys.
- Content is data, validated by schemas, and versioned independently from engine code.
- No secrets in source, fixtures, examples, logs, screenshots, or issue bodies.
- Feature flags default to off for PvP, trade, ads, supporter shop, and suggestive presentation.

## 5. Verification rules

A task is not complete until:

- acceptance criteria are demonstrated;
- unit/integration tests cover changed rules;
- deterministic rules include fixed-seed tests;
- migrations have forward and rollback/recovery notes;
- accessibility checks are included for UI work;
- mobile 360 px and desktop 1280 px are verified for UI work;
- free-tier impact and abuse impact are described for server work;
- documentation and ADRs are updated when a decision changes.

Never weaken or delete tests merely to make a check pass.

## 6. Scope and stopping conditions

Stop and open a decision note instead of improvising when work would:

- use or closely reproduce source-game assets or protected expression;
- add sexual content beyond the R-15 boundary;
- depict or imply an underage/age-ambiguous character suggestively;
- create an irreversible economy migration;
- enable monetization, ads, real-money purchases, or player-to-player trade;
- require a paid cloud resource;
- materially change the core loop or player promise;
- expose personal data or moderation-sensitive data.

## 7. Required handoff format

End each implementation response/PR with:

1. What changed
2. Why it satisfies the task
3. Tests and exact commands run
4. Screenshots or text-mode transcripts where relevant
5. Cost, security, accessibility, content, and economy impacts
6. Known limitations
7. Next smallest task
