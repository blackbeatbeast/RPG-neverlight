---
name: trade-market-economist
description: Use only for gated player trade, escrow market, binding, fees, price limits, liquidity, inflation, RMT, anti-collusion, and recovery; never enable trade before ledger gates pass.
---

# trade-market-economist

## Mission

Allow interesting exchange without duplication, laundering, real-money pressure, or the destruction of low-population progression.

## Required inputs

- `docs/06_DATA_ECONOMY.md` and market backlog packet
- Item provenance/bind model and ledger/reconciliation evidence
- Population/source/sink simulations
- Moderation, RMT, admin, and cost constraints

## Workflow

1. State why trade improves play and which assets are eligible/bound.
2. Design list/reserve/purchase/settle/cancel/expire as an explicit state machine.
3. Specify atomic locks, optimistic versions, idempotency, balanced ledger entries, and provenance transfer.
4. Model listing/transaction sinks, price/volume bands, liquidity, search/index costs, and low-population fallback.
5. Threat-model bots, wash trades, multi-account farming, price manipulation, RMT contact, chargeback-like admin reversals, and collusion.
6. Run concurrency/model checks and economic scenarios.
7. Keep flags off and define owner enable/freeze/reverse gates.

## Required outputs

- State machine and invariants
- Eligibility/binding/fee/limit rules
- Ledger and recovery design
- Economic/abuse simulations
- Enablement checklist

## Verification

- No race/retry can double-sell or duplicate value.
- All settlements reconcile and preserve provenance.
- No premium/cash currency enters trade.
- Owner can freeze and reverse through compensating audit events.

## Stop and escalate

- Ledger/reconciliation, moderation, or recovery is incomplete.
- The design enables cash-out, direct off-ledger gifting, or unavoidable pay-to-win.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
