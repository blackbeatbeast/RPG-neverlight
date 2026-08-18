# 015 — Implement disabled monetization and entitlement boundaries

- Status: Ready for issue
- Phase: Expansion / gated
- Required Skills: `monetization-readiness-architect`, `clean-room-ip-guardian`, `security-and-abuse-guardian`, `accessibility-performance-auditor`

## Objective

Create dormant, testable feature boundaries for direct non-tradeable supporter entitlements and optional ad slots, while proving they cannot affect combat/economy and remain disabled.

## In scope

- Entitlement interface/data model without payment processor integration.
- Hidden layout slots that collapse when disabled.
- Architecture tests preventing game-core/loot/market from importing monetization.
- General-only ad placement classification, privacy/policy checklist, refund/revocation design note.
- Feature flags and kill switches all false.

## Out of scope

- Payments
- Ads network SDK
- Prices/products
- Enabling any revenue feature
- Paid cosmetics production

## Acceptance criteria

- No monetization module is reachable in normal UI/API when flags are off.
- Architecture tests prove no combat/loot/drop/market dependency.
- Disabled slots leave no layout gap or accessibility noise.
- No premium/tradeable currency is introduced.
- Enablement requires a new ADR and owner approval.

## Verification

Run and record the exact output/result of:

- `pnpm test:architecture`
- `pnpm test:e2e -- --grep monetization-off`
- `pnpm build && inspect client bundle/routes`
- `manual policy/privacy gate review`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Implementation requires choosing a processor/ad network or accepting current terms.
- Any entitlement creates gameplay/economy advantage.

Do not begin the next backlog packet in the same PR.
