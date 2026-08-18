# 06 — Data, economy, and ledger design

## 1. Economy objectives

- Every item, card, currency unit, material, and entitlement has an explainable source and sink.
- Retries, browser back, double taps, and network failures never duplicate value.
- Players can understand why an item is bound, where it came from, and what happened to it.
- Balance data can change without corrupting historical instances.
- Future trade can be enabled without rewriting the core inventory model.

## 2. Identifier and version conventions

- UUIDv7/ULID-like sortable opaque IDs for account-owned instances.
- Stable string IDs for content definitions, namespaced by content domain.
- Integer optimistic `version` on mutable aggregates.
- `ruleset_version`, `content_version`, and `schema_version` recorded on resolutions and mints.
- Display names never serve as keys.

## 3. Core entities

### Identity and preferences

- `accounts`
- `sessions`
- `players`
- `player_preferences`
- `account_devices`

### Content

- `content_bundles`
- `content_activation`
- definitions may be bundled/read-only rather than normalized into D1 at first

### Game state

- `player_state`
- `route_runs`
- `encounters`
- `combat_resolutions`
- `quest_progress`
- `codex_entries`

### Owned value

- `item_instances`
- `item_affixes`
- `card_instances` or stack ownership where uniqueness is unnecessary
- `inventory_locations`
- `currency_balances`
- `material_balances`
- `crafting_jobs` if asynchronous jobs are later introduced

### Integrity

- `idempotency_records`
- `economy_ledger`
- `audit_events`
- `state_snapshots` or reconciliation checkpoints

### Social/market later

- `player_profiles`
- `posts`, `reports`, `blocks`, `moderation_actions`
- `guilds`, `guild_memberships`
- `market_listings`, `market_reservations`, `market_settlements`

## 4. Ledger event model

Every value-changing transaction emits one or more balanced domain events.

Suggested fields:

```text
ledger_event_id
transaction_id
account_id / player_id
asset_type
asset_instance_id or balance_key
quantity_delta
reason_code
source_ref_type / source_ref_id
ruleset_version / content_version
idempotency_key_hash
created_at
metadata_json (strictly bounded and schema-validated)
```

Examples:

- `LOOT_ITEM_MINT`
- `ITEM_SALVAGE_CONSUME`
- `MATERIAL_SALVAGE_GRANT`
- `CRAFT_MATERIAL_CONSUME`
- `CRAFT_ITEM_MINT`
- `CARD_DUPLICATE_CONSUME`
- `INK_GRANT`
- `MARKET_LIST_LOCK`
- `MARKET_SETTLE_TRANSFER`
- `ADMIN_REVERSAL`

Do not edit or delete ledger events in normal operation. Corrections append compensating events.

## 5. Idempotency contract

For each mutation:

1. Require an idempotency key scoped to account + endpoint/action.
2. Hash and store it with input hash and status.
3. If a completed record exists with the same input hash, return its stored result.
4. If the key exists with a different input hash, return a conflict.
5. Reserve/execute within the transaction boundary.
6. Store response snapshot or deterministic response reference.
7. Expiration must outlive plausible client retries and background replays.

## 6. Item provenance

Every item instance records:

- content definition and version;
- mint event and timestamp;
- source route/encounter/craft/event;
- initial rolls and RNG proof fields sufficient for internal replay;
- current owner and location;
- bind status and reason;
- market/trade history references when enabled;
- transformations, rerolls, upgrades, and salvage terminal event.

Public UI shows a safe subset. Internal tools show full audit context.

## 7. Balance constraints

- Use integer/fixed-point arithmetic for authoritative stats where practical.
- Explicit multiplier groups and caps.
- No unbounded recursive procs.
- Every affix has allowed slots, tags, tiers, weights, conflicts, and power budget.
- Drop tables sum and validate exactly under their model.
- Simulation compares sources/sinks, progression percentiles, and rare acquisition tails.
- Content activation requires a balance report.

## 8. Currency model

Prototype currencies:

- **Crowns:** normal account currency; earned and spent in gameplay.
- **Scrap:** salvage material family, preferably typed rather than a universal second currency.
- **Ink:** duplicate Memory Card sink/source loop.

Do not introduce premium currency at launch. If supporter commerce is later approved, entitlements should be direct and non-tradeable rather than a general-purpose currency.

## 9. Market readiness gates

Before any player listing can settle:

- ledger reconciliation passes against generated histories;
- duplicate/replay/race tests pass;
- item locking and reservation expiry are proven;
- price and volume limits exist;
- moderation and RMT policy exists;
- owner can freeze market writes without disabling normal play;
- admin can inspect and reverse a transaction with audit trail;
- economic simulation covers hoarding, bot farming, wash trading, and low-population liquidity.

## 10. Retention and privacy

Collect only data necessary to operate, secure, moderate, and improve the game. Define deletion/export behavior before public accounts. Separate moderation evidence retention from general analytics. Do not log private message content broadly; there are no private messages in the initial scope.
