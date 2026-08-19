# Local D1 migrations

The bootstrap migration is intentionally limited to a marker table. It does not create player,
identity, item, card, currency, social, or content tables.

Migrations are append-only. A local reset may remove `.wrangler/state`; a future destructive
migration must include a backup/export and recovery note before it is proposed.
