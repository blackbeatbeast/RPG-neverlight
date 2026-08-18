# 013 — Implement the gated escrow market and trade economy

- Status: Ready for issue
- Phase: Expansion / gated
- Required Skills: `trade-market-economist`, `game-data-and-migrations`, `security-and-abuse-guardian`, `test-and-verification-engineer`

## Objective

Implement an off-by-default escrow listing state machine with item locks, settlement ledger, fees, limits, anti-RMT controls, and admin reversal.

## In scope

- List/reserve/purchase/settle/cancel/expire states with optimistic version and idempotency.
- Trade/bind eligibility, item lock, listing and transaction fees, price/volume limits.
- Market search/history with privacy-safe data.
- Reconciliation, suspicious graph/rate rules, freeze/reversal tools, simulation.

## Out of scope

- Real-money trading
- Premium/tradeable currency
- Direct gifting
- Auction bidding unless separately designed
- Flag enablement for public players

## Acceptance criteria

- Race/retry/property tests cannot duplicate item/currency or double-sell.
- Every settlement balances in ledger and preserves provenance.
- Owner can freeze and reverse with compensating events/audit.
- Simulation covers low liquidity, bots, wash trading, hoarding, inflation.
- Feature remains off until explicit owner gate.

## Verification

Run and record the exact output/result of:

- `pnpm market:model-check`
- `pnpm test:concurrency -- --suite market`
- `pnpm economy:simulate -- --market scenarios/all`
- `pnpm ledger:reconcile -- --fixture market`
- `manual freeze/reversal drill`

## Required PR evidence

- Screenshots/transcript where UI or operations changed.
- Determinism/economy evidence where authoritative state changed.
- Security, abuse, privacy, accessibility, cost, content/IP, and migration impact.
- Known limitations and the next smallest packet.

## Stop and escalate when

- Any path allows cash value conversion or untracked direct transfer.
- Reconciliation or recovery is not proven.

Do not begin the next backlog packet in the same PR.
