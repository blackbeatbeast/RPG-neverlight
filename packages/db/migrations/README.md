# Local D1 migrations

`0000_bootstrap.sql` creates only the foundation marker. `0001_guest_identity.sql` adds the
server-owned guest account, session, player aggregate, preference, feature-flag, inventory-location,
idempotency, and rate-limit tables required by Issue #4. `0002_exploration_vertical_slice.sql` adds
server-owned route runs, encounters, and append-only combat resolutions for Issue #6. It creates no
real loot, currency, trade, or social value.

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
