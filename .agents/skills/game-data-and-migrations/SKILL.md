---
name: game-data-and-migrations
description: Use for D1 schema, migrations, repositories, player aggregates, economy ledgers, idempotency, content activation, backups, or recovery; not for choosing game balance.
---

# game-data-and-migrations

## Mission

Make authoritative state evolvable, auditable, retry-safe, and recoverable before adding valuable or tradeable systems.

## Required inputs

- `docs/06_DATA_ECONOMY.md`, ADR 0004, and technical spec
- State transition/use cases and invariants
- Current schema/migration history
- Retention, privacy, and operational requirements

## Workflow

1. Model aggregates, immutable events, current/materialized state, ownership, and version preconditions.
2. Design forward migration plus rollback/recovery/export notes before writing SQL.
3. Implement typed repositories and bounded indexed queries.
4. Wrap mutations with idempotency record, input hash, ledger events, state update, and response result.
5. Add constraints/indexes and prove race/retry behavior in tests.
6. Add reconciliation queries/tools and admin freeze/recovery paths.
7. Measure row scans/writes and document free-tier impact.

## Required outputs

- Migration and schema diagram
- Repository/transaction implementation
- Idempotency/ledger event definitions
- Tests, reconciliation, recovery notes
- Query/index/cost report

## Verification

- Empty DB migrates; representative prior DB migrates.
- Retries return original result and conflicts reject mismatched input.
- Ledger reconciles current balances/ownership.
- No full scans on hot paths without explicit justification.

## Stop and escalate

- Migration is destructive without tested recovery.
- An economy mutation cannot be atomic/auditable under the chosen design.

## Handoff

End with: decision/result, files or specs changed, checks/evidence, unresolved risks, and the next named Skill or backlog packet. Do not continue into the next packet automatically.
