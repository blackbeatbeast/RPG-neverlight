# 002 — Build the semantic retro/modern UI shell

- Status: Ready for issue
- Phase: Foundation
- Required Skills: `retro-modern-ui-designer`, `accessibility-performance-auditor`, `product-vision-keeper`

## Objective

Implement the canonical page anatomy once, with retro and modern themes, phone/desktop responsiveness, numbered keyboard commands, and no mandatory animation.

## In scope

- Routes/pages for landing, town, exploration, encounter, result, inventory, codex, settings, and maintenance using fixture data.
- Semantic command list with 1–9 and 0/back shortcuts that never fire inside text inputs.
- Theme/density preferences stored locally and modeled for later server sync.
- Focus management, skip link, live-region pattern, reduced motion, and general/suggestive preference UI with suggestive flag disabled.
- Visual regression or screenshot coverage at 360 and 1280 widths.

## Out of scope

- Real API mutations
- Final art
- Enabling suggestive content
- Complex inventory rules

## Acceptance criteria

- All pages work by touch and keyboard.
- Retro and modern modes expose identical information/actions.
- No horizontal page scroll at 360 px or 200% zoom target.
- Core play is understandable with images disabled.
- No copied CSS/layout/assets from reference sites.

## Verification

Run and record the exact output/result of:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e -- --project=mobile`
- `pnpm test:e2e -- --project=desktop`
- `manual screen-reader/keyboard transcript in PR`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- A design needs separate DOM/application implementations for retro and modern.
- Final visual direction would imitate a reference page rather than the written abstraction.

Do not begin the next backlog packet in the same PR.
