-- Issue #6 exploration-to-combat vertical slice.
-- Route authority, encounter seeds, combat state, and resolution hashes stay server-owned.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS route_runs (
  route_run_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  route_id TEXT NOT NULL,
  route_version TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('exploration', 'encounter', 'result', 'complete')),
  version INTEGER NOT NULL CHECK (version > 0),
  node_id TEXT NOT NULL,
  encounter_id TEXT,
  route_seed INTEGER NOT NULL CHECK (route_seed >= 0 AND route_seed <= 4294967295),
  route_seed_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS route_runs_player_created_idx
  ON route_runs(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS route_runs_expiry_idx
  ON route_runs(expires_at);

CREATE TABLE IF NOT EXISTS encounters (
  encounter_id TEXT PRIMARY KEY,
  route_run_id TEXT NOT NULL REFERENCES route_runs(route_run_id) ON DELETE CASCADE,
  encounter_version TEXT NOT NULL,
  pattern TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved')),
  encounter_seed INTEGER NOT NULL CHECK (encounter_seed >= 0 AND encounter_seed <= 4294967295),
  encounter_seed_hash TEXT NOT NULL,
  combat_state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS encounters_route_run_idx
  ON encounters(route_run_id, created_at DESC);

CREATE TABLE IF NOT EXISTS combat_resolutions (
  resolution_id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL REFERENCES encounters(encounter_id) ON DELETE CASCADE,
  route_run_id TEXT NOT NULL REFERENCES route_runs(route_run_id) ON DELETE CASCADE,
  ruleset_version TEXT NOT NULL,
  combat_seed INTEGER NOT NULL CHECK (combat_seed >= 0 AND combat_seed <= 4294967295),
  input_state_hash TEXT NOT NULL,
  output_state_hash TEXT NOT NULL,
  resolution_hash TEXT NOT NULL,
  resolution_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS combat_resolutions_encounter_idx
  ON combat_resolutions(encounter_id, created_at DESC);
