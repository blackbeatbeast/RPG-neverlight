-- Issue #4 guest identity and player aggregate.
-- All identifiers are server-generated opaque strings. No personal profile fields are stored.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  account_kind TEXT NOT NULL CHECK (account_kind = 'guest'),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts(account_id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  vitality INTEGER NOT NULL DEFAULT 10 CHECK (vitality >= 0),
  max_vitality INTEGER NOT NULL DEFAULT 10 CHECK (max_vitality > 0),
  focus INTEGER NOT NULL DEFAULT 3 CHECK (focus >= 0),
  max_focus INTEGER NOT NULL DEFAULT 3 CHECK (max_focus > 0),
  guard INTEGER NOT NULL DEFAULT 0 CHECK (guard >= 0),
  speed INTEGER NOT NULL DEFAULT 5 CHECK (speed >= 0),
  luck INTEGER NOT NULL DEFAULT 0 CHECK (luck >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_account_id_idx ON sessions(account_id);

CREATE TABLE IF NOT EXISTS player_preferences (
  player_id TEXT PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'ja-JP' CHECK (locale IN ('ja-JP', 'en-US')),
  theme TEXT NOT NULL DEFAULT 'retro' CHECK (theme IN ('retro', 'modern')),
  presentation TEXT NOT NULL DEFAULT 'general' CHECK (presentation = 'general'),
  reduced_motion INTEGER NOT NULL DEFAULT 0 CHECK (reduced_motion IN (0, 1)),
  images_enabled INTEGER NOT NULL DEFAULT 1 CHECK (images_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_feature_flags (
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  flag_name TEXT NOT NULL CHECK (
    flag_name IN (
      'pvp',
      'player_trade',
      'market',
      'ads',
      'supporter_shop',
      'suggestive_presentation',
      'user_generated_images'
    )
  ),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, flag_name)
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  location_kind TEXT NOT NULL CHECK (location_kind IN ('inventory', 'vault', 'equipment')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (player_id, location_id)
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (account_id, action, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idempotency_expiry_idx
  ON idempotency_records(expires_at);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT NOT NULL,
  action TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (bucket_key, action)
);
