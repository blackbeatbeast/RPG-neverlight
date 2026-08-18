# ADR 0004 — Server authority, ledger, and idempotency

- Status: Accepted
- Date: 2026-08-19

## Decision
Combat, loot, inventory, currency, cards, crafting, trade, and entitlements are server-authoritative. All mutations use idempotency keys. Value changes append ledger events and update derived/current state atomically.

## Consequences
Implementation is more deliberate but prevents common browser-game duplication and supports trade/recovery later. Client-calculated results are previews only.
