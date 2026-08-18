# 001 — Bootstrap the reproducible monorepo and CI

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `cloudflare-fullstack-engineer`, `test-and-verification-engineer`, `product-vision-keeper`

## Objective

Create the smallest reproducible TypeScript workspace that proves package boundaries, local Cloudflare/D1 development, deterministic test wiring, and blueprint CI without implementing game content.

## In scope

- Pin Node, pnpm, TypeScript, React/Vite, Hono, Wrangler, test, and lint/format tool versions.
- Create workspaces for apps/web, apps/worker, packages/game-core, packages/content-schema, packages/db, and packages/ui.
- Add strict tsconfig layers, lint/format/type/test/build scripts, local D1 config, initial empty migration, and GitHub Actions.
- Add one pure fixed-seed game-core example test and one content-schema fixture test.
- Document setup for Windows PowerShell and standard shells.

## Out of scope

- Persistent player state
- Real combat or loot
- Authentication provider
- Preview deployment secrets
- Trade, social, monetization

## Acceptance criteria

- Fresh clone installs with the pinned package manager.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- No production package imports from a forbidden layer; game-core has no I/O dependency.
- Local Worker starts against local D1 with a health endpoint.
- CI runs blueprint validation plus the same checks.

## Verification

Run and record the exact output/result of:

- `corepack enable`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm dev (manual health check)`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- A proposed dependency requires payment or unclear licensing.
- The selected Cloudflare package versions materially change the accepted architecture.

Do not begin the next backlog packet in the same PR.
