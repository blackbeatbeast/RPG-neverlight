-- Issue #1 bootstrap marker only. Player, economy, and content tables belong to later packets.
CREATE TABLE IF NOT EXISTS neverlight_bootstrap (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL
);
