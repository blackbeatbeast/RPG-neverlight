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

## Issue #1 foundation workspace

The bootstrap workspace is intentionally small. It contains the following independent boundaries:

```text
apps/web              React + Vite client
apps/worker           Hono + Cloudflare Worker API
packages/game-core    pure deterministic TypeScript rules
packages/content-schema  minimal versioned content validation
packages/db           D1 boundary and local migrations
packages/ui           shared semantic UI component
```

### First setup (standard shell)

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm db:migrate:local
```

### First setup (Windows PowerShell)

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm db:migrate:local
```

CI installs the pinned pnpm 9.15.4 directly with `pnpm/action-setup@v4`; it does not run
`corepack enable` a second time. On Windows, if the local `corepack enable` command fails with
`EPERM`, do not use administrator elevation or disable signature verification. Install the pinned
pnpm version into a user-writable prefix instead, then open a new shell (or update the current
session's `PATH`):

```powershell
npm install --global --prefix "$env:LOCALAPPDATA\pnpm" pnpm@9.15.4
$env:Path = "$env:LOCALAPPDATA\pnpm;$env:Path"
pnpm --version
```

Continue only when the version check reports `9.15.4`.

The checked-in `.node-version`, `.nvmrc`, and root `package.json` pin Node.js 22.13.0 and pnpm
9.15.4. No `.env`, `.dev.vars`, Cloudflare account, production D1 database, or secret is needed
for the local foundation.

### Development servers

Start the web client and local Worker together:

```bash
pnpm dev
```

```powershell
pnpm dev
```

The web client is served at `http://127.0.0.1:5173`. Its `/api` requests proxy to the local Worker
at `http://127.0.0.1:8787`. The Worker health check is:

```text
GET http://127.0.0.1:8787/api/health
```

The expected local response is a JSON object with `ok: true`, service
`project-neverlight-worker`, environment `local`, and version `development`.

### Local D1 migration

The migrations live in `packages/db/migrations` and are wired into the Worker through a local-only
Wrangler configuration. `pnpm db:migrate:local` applies the bootstrap marker and the guest/player
identity schema to local D1:

```bash
pnpm db:migrate:local
```

```powershell
pnpm db:migrate:local
```

This writes only to Wrangler's local `.wrangler/state` directory. Issue #4 creates only guest
identity, player aggregate, preferences, feature-flag, inventory-location, idempotency, and rate-limit
scaffolding; it does not create item, card, currency, combat, trade, or social value. To reset local
state, stop development tools and remove `.wrangler/state` from the Worker directory. To delete one
guest's data through the API, send `POST /api/v1/guest/reset` with the current CSRF token and an
`Idempotency-Key`; the Worker deletes the guest account and clears both cookies.

### Verification commands

```bash
node scripts/validate-blueprint.mjs
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm combat:replay fixtures/combat/*.json
pnpm combat:simulate -- --runs 10000
```

The same commands work in Windows PowerShell. `pnpm test` also runs the blueprint check, the fixed
seed `game-core` test, the valid/invalid content fixture test, and the Worker health test. The combat
commands replay the versioned golden fixtures and run a fixed-seed 10,000-run report; filesystem
access is confined to these CLI scripts, not the pure `packages/game-core` rules.

The Issue #2 semantic shell also has browser checks for the 360 px touch layout and the 1280 px
desktop layout. Install the local Chromium browser once, then run both projects:

```bash
pnpm exec playwright install chromium
pnpm test:e2e -- --project=mobile
pnpm test:e2e -- --project=desktop
```

The browser checks cover the canonical screen flow, numbered keyboard commands, touch buttons,
input-field shortcut suppression, Retro/Modern command parity, empty/error/maintenance states,
images-disabled rendering, reduced motion, and 200% zoom reflow. CI installs the same pinned
Chromium browser using the runner's existing system libraries and uploads the Playwright evidence
as an artifact.

## Launch stance

- Repository visibility remains owner-controlled; publishing scripts never change it.
- Free access for players during prototype and alpha.
- No ads, paid loot boxes, paid power, or tradeable premium currency.
- Cloud cost guards and degradation paths are required before public alpha.
- Public release requires an IP/name review, privacy terms, community policy, and platform-specific content/rating review.

## License

All rights reserved during private development. See [`LICENSE`](LICENSE). Third-party dependencies retain their own licenses; every asset needs provenance documentation.
