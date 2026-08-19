-- Issue #7 server-minted loot, inventory decisions, equipment, salvage, and codex progress.
-- Item history is retained after salvage so reconciliation can prove that every value change
-- has a matching append-only ledger event. No player trade or premium currency is introduced.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS item_instances (
  item_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  base_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('weapon', 'guard', 'head', 'body', 'accessory', 'relic')),
  item_level INTEGER NOT NULL CHECK (item_level BETWEEN 1 AND 20),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'unique', 'relic')),
  quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 100),
  base_stats_json TEXT NOT NULL,
  affixes_json TEXT NOT NULL,
  unique_rule TEXT,
  bind_state TEXT NOT NULL CHECK (bind_state IN ('unbound-until-equipped', 'account-bound')),
  location TEXT NOT NULL CHECK (location IN ('inventory', 'vault', 'equipment')),
  equipment_slot TEXT,
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'salvaged')),
  provenance_json TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  content_version TEXT NOT NULL,
  mint_seed INTEGER NOT NULL CHECK (mint_seed BETWEEN 0 AND 4294967295),
  source_ref TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  salvaged_at TEXT,
  CHECK (equipment_slot IS NULL OR location = 'equipment'),
  CHECK ((status = 'active' AND salvaged_at IS NULL) OR (status = 'salvaged' AND salvaged_at IS NOT NULL)),
  CHECK (status = 'active' OR location != 'equipment')
);

CREATE INDEX IF NOT EXISTS item_instances_player_status_idx
  ON item_instances(player_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS item_instances_player_location_idx
  ON item_instances(player_id, location, equipment_slot);

CREATE INDEX IF NOT EXISTS item_instances_provenance_idx
  ON item_instances(player_id, source_ref, content_version);

CREATE TABLE IF NOT EXISTS economy_ledger (
  ledger_event_id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('item', 'material')),
  asset_instance_id TEXT,
  material_key TEXT,
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta != 0),
  reason_code TEXT NOT NULL,
  source_ref_type TEXT NOT NULL,
  source_ref_id TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  content_version TEXT NOT NULL,
  idempotency_key_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (
    (asset_type = 'item' AND asset_instance_id IS NOT NULL AND material_key IS NULL AND ABS(quantity_delta) = 1)
    OR (asset_type = 'material' AND asset_instance_id IS NULL AND material_key IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS economy_ledger_transaction_asset_idx
  ON economy_ledger(transaction_id, asset_type, COALESCE(asset_instance_id, material_key), reason_code);

CREATE INDEX IF NOT EXISTS economy_ledger_player_created_idx
  ON economy_ledger(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS economy_ledger_item_idx
  ON economy_ledger(asset_instance_id, asset_type);

CREATE TABLE IF NOT EXISTS material_balances (
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  material_key TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, material_key)
);

CREATE TABLE IF NOT EXISTS codex_progress (
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('item', 'affix', 'unique', 'enemy', 'location')),
  entry_id TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  discovery_count INTEGER NOT NULL DEFAULT 1 CHECK (discovery_count >= 1),
  PRIMARY KEY (player_id, entry_type, entry_id)
);

CREATE INDEX IF NOT EXISTS codex_progress_player_type_idx
  ON codex_progress(player_id, entry_type, first_seen_at);
