# Local D1 migrations

`0000_bootstrap.sql` creates only the foundation marker. `0001_guest_identity.sql` adds the
server-owned guest account, session, player aggregate, preference, feature-flag, inventory-location,
idempotency, and rate-limit tables required by Issue #4. It creates no trade, currency, combat, or
social value.

Migrations are append-only. A local reset may remove `.wrangler/state`; a future destructive
migration must include a backup/export and recovery note before it is proposed.

## Guest data reset

The Worker exposes `POST /api/v1/guest/reset`. It requires the current HttpOnly session cookie, the
matching `X-CSRF-Token` double-submit header, and an `Idempotency-Key`. The server deletes the guest
account and all dependent player/session/preferences/scaffolding records, then clears both cookies.
No client-supplied player ID, balance, or feature flag is accepted. Account linking and export are
deliberately deferred to a later packet.
