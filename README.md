# Project Neverlight

> **Working codename / internal blueprint. The public title is not cleared.**

Project Neverlight is a clean-room, original-IP browser RPG inspired by the *feel* of early Japanese mobile web games: still images, concise text, numbered commands, asynchronous community, and a satisfying “tap a few times, make progress” loop.

It is **not** a remake, port, private server, or continuation of any existing title. No original assets, names, story, maps, code, databases, UI captures, or proprietary data may enter this repository.

## Product sentence

A free-first, mobile-and-PC browser hack-and-slash RPG where players explore through static illustrated scenes, queue compact turn commands, collect build-defining loot and “Memory Cards,” and meet other players through an asynchronous shared world.

## Non-negotiable pillars

1. **Still image + text first.** No mandatory animation, Live2D, video, or real-time 3D.
2. **One-thumb / one-key play.** The core loop must remain comfortable on a phone and keyboard-accessible on PC.
3. **Deep collection, light operation.** Builds, affixes, cards, codex, crafting, and rare discoveries create depth without requiring frantic input.
4. **Async social world.** Bulletin boards, guilds, player traces, bounties, and later trade—not a real-time chat dependency.
5. **Original IP and clean-room implementation.** Respect the historical inspiration by preserving principles, not protected expression.
6. **All named characters are unambiguously adults.** Optional, tasteful, non-explicit R-15-style allure only; no sexualized minors or age ambiguity.
7. **Free-first and no pay-to-win.** Ads and supporter commerce are architecturally isolated and disabled at launch.
8. **Server authority.** Combat, loot, currency, cards, crafting, and trade are resolved and recorded server-side.

## Start here

- Japanese integrated plan: [`PROJECT_PLAN_JA.md`](PROJECT_PLAN_JA.md)
- Human owner: [`docs/00_EXECUTIVE_BRIEF.md`](docs/00_EXECUTIVE_BRIEF.md)
- Codex: [`CODEX_START_HERE.md`](CODEX_START_HERE.md)
- Repository rules: [`AGENTS.md`](AGENTS.md)
- Skills catalog: [`docs/CODEX_SKILLS_CATALOG.md`](docs/CODEX_SKILLS_CATALOG.md)
- Sequenced work: [`docs/11_CODEX_WORKPLAN.md`](docs/11_CODEX_WORKPLAN.md)
- Executable backlog: [`backlog/00_EPICS.md`](backlog/00_EPICS.md)
- Product constraints: [`config/product-constraints.yml`](config/product-constraints.yml)
- Codex copy-paste commands: [`docs/17_CODEX_COMMANDS_JA.md`](docs/17_CODEX_COMMANDS_JA.md)
- Requirement traceability: [`docs/15_REQUIREMENTS_TRACEABILITY.md`](docs/15_REQUIREMENTS_TRACEABILITY.md)
- Zero-spend budget: [`docs/16_FREE_TIER_BUDGET.md`](docs/16_FREE_TIER_BUDGET.md)

## Proposed repository layout

```text
apps/                          # web and worker applications
.agents/skills/                # project-specific Codex Skills
.github/                       # issue forms, PR template, blueprint CI
apps/web/                      # responsive React/Vite client
apps/worker/                   # Hono Cloudflare Worker API + asset entry
packages/game-core/            # deterministic pure game rules
packages/content-schema/       # schemas and content validation
packages/db/                   # D1 migrations and repositories
packages/ui/                   # shared semantic retro/modern UI
content/examples/              # non-production example content
config/                        # hard product constraints and flags
docs/                          # source of truth
backlog/                       # issue-ready task packets
scripts/                       # validation and publishing helpers
```

## Blueprint state

This repository is intentionally a **pre-implementation control plane**. It contains the decisions and boundaries Codex needs before generating the application. The first implementation task is `backlog/001-bootstrap-monorepo.md`.

Run the blueprint check:

```bash
node scripts/validate-blueprint.mjs
```

## Launch stance

- Private development repository at first.
- Free access for players during prototype and alpha.
- No ads, paid loot boxes, paid power, or tradeable premium currency.
- Cloud cost guards and degradation paths are required before public alpha.
- Public release requires an IP/name review, privacy terms, community policy, and platform-specific content/rating review.

## License

All rights reserved during private development. See [`LICENSE`](LICENSE). Third-party dependencies retain their own licenses; every asset needs provenance documentation.
