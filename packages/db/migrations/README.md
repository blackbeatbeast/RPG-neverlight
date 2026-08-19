# Local D1 migrations

`0000_bootstrap.sql` creates only the foundation marker. `0001_guest_identity.sql` adds the
server-owned guest account, session, player aggregate, preference, feature-flag, inventory-location,
idempotency, and rate-limit tables required by Issue #4. `0002_exploration_vertical_slice.sql` adds
server-owned route runs, encounters, and append-only combat resolutions for Issue #6. `0003_loot_inventory_codex.sql`
adds server-minted item instances, the append-only economy ledger, material balances, and codex
progress for Issue #7. It creates no player trade, premium currency, or social value.

Migrations are append-only. A local reset may remove `.wrangler/state`; a future destructive
migration must include a backup/export and recovery note before it is proposed.

## Guest data reset

The Worker exposes `POST /api/v1/guest/reset`. It requires the current HttpOnly session cookie, the
matching `X-CSRF-Token` double-submit header, and an `Idempotency-Key`. The server deletes the guest
account and all dependent player/session/preferences/scaffolding records, then clears both cookies.
No client-supplied player ID, balance, or feature flag is accepted. Account linking and export are
deliberately deferred to a later packet.

## Exploration route recovery

Issue #6 route runs carry an optimistic `version` and an expiry timestamp. A GET of the current route
returns an `expired` state without mutating data, while stale or expired writes are rejected. Repeating
the same write with the same `Idempotency-Key` returns the stored response; a key reused with different
input is rejected. Route and encounter seeds are stored only as server-side values and hashes; browser
responses expose the hashes, not the seeds.

## Loot and ledger recovery

Issue #7 keeps salvaged item rows as terminal history instead of deleting them. A mint records one
`LOOT_ITEM_MINT` event; salvage records one `ITEM_SALVAGE_CONSUME` event per item plus a
`MATERIAL_SALVAGE_GRANT` event. The transaction stores a bounded response in the existing
`idempotency_records` table, so retrying a key returns the original item/material result. `economy_ledger`
is append-only in normal operation; reconciliation is run with `pnpm ledger:reconcile -- --fixture all`.
Before any future destructive migration, export the D1 database and rehearse restoration.
