/// <reference types="@cloudflare/workers-types" />

export interface D1RepositoryBoundary {
  readonly db: D1Database;
}

export function createD1RepositoryBoundary(db: D1Database): D1RepositoryBoundary {
  return { db };
}

export const FEATURE_FLAG_KEYS = [
  'pvp',
  'player_trade',
  'market',
  'ads',
  'supporter_shop',
  'suggestive_presentation',
  'user_generated_images',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export interface PlayerPreferences {
  locale: 'ja-JP' | 'en-US';
  theme: 'retro' | 'modern';
  presentation: 'general';
  reducedMotion: boolean;
  imagesEnabled: boolean;
}

export interface InventoryLocation {
  id: string;
  kind: 'inventory' | 'vault' | 'equipment';
  sortOrder: number;
}

export interface PlayerView {
  playerId: string;
  handle: string;
  version: number;
  level: number;
  experience: number;
  stats: {
    vitality: number;
    maxVitality: number;
    focus: number;
    maxFocus: number;
    guard: number;
    speed: number;
    luck: number;
  };
  preferences: PlayerPreferences;
  inventoryLocations: InventoryLocation[];
  featureFlags: Record<FeatureFlagKey, false>;
}

export interface GuestSessionInput {
  accountId: string;
  playerId: string;
  sessionId: string;
  handle: string;
  tokenHash: string;
  csrfTokenHash: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthenticatedSession {
  accountId: string;
  playerId: string;
  sessionId: string;
  csrfTokenHash: string;
  expiresAt: string;
}

export interface UpdatePreferencesInput {
  accountId: string;
  playerId: string;
  action: string;
  idempotencyKey: string;
  inputHash: string;
  patch: Partial<PlayerPreferences>;
  now: string;
  expiresAt: string;
}

export interface StoredMutationResult {
  player: PlayerView;
  replayed: boolean;
}

export interface RateLimitInput {
  bucketKey: string;
  action: string;
  windowStart: number;
  limit: number;
  now: string;
}

export interface GuestDataRepository {
  authenticateSession(tokenHash: string, now: string): Promise<AuthenticatedSession | null>;
  createGuest(input: GuestSessionInput): Promise<void>;
  getPlayer(playerId: string): Promise<PlayerView | null>;
  rotateSession(currentSessionId: string, next: GuestSessionInput): Promise<void>;
  revokeSession(sessionId: string, now: string): Promise<void>;
  resetGuest(accountId: string): Promise<void>;
  updatePreferences(input: UpdatePreferencesInput): Promise<StoredMutationResult>;
  consumeRateLimit(input: RateLimitInput): Promise<boolean>;
}

export class GuestRepositoryError extends Error {
  constructor(
    public readonly code:
      | 'IDEMPOTENCY_KEY_REUSED'
      | 'IDEMPOTENCY_IN_PROGRESS'
      | 'PLAYER_STATE_CONFLICT'
      | 'PLAYER_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'GuestRepositoryError';
  }
}

interface PlayerRow {
  account_id: string;
  player_id: string;
  handle: string;
  version: number;
  level: number;
  experience: number;
  vitality: number;
  max_vitality: number;
  focus: number;
  max_focus: number;
  guard: number;
  speed: number;
  luck: number;
}

interface SessionRow {
  account_id: string;
  player_id: string;
  session_id: string;
  csrf_token_hash: string;
  expires_at: string;
}

interface PreferencesRow {
  locale: PlayerPreferences['locale'];
  theme: PlayerPreferences['theme'];
  presentation: PlayerPreferences['presentation'];
  reduced_motion: number;
  images_enabled: number;
}

interface FeatureFlagRow {
  flag_name: FeatureFlagKey;
  enabled: number;
}

interface InventoryLocationRow {
  location_id: string;
  location_kind: InventoryLocation['kind'];
  sort_order: number;
}

interface IdempotencyRow {
  input_hash: string;
  response_json: string;
  expires_at: string;
}

const PENDING_RESPONSE = '__pending__';
const DEFAULT_PREFERENCES: PlayerPreferences = {
  locale: 'ja-JP',
  theme: 'retro',
  presentation: 'general',
  reducedMotion: false,
  imagesEnabled: true,
};

function booleanFromSql(value: number): boolean {
  return value === 1;
}

function featureFlagsFromRows(rows: FeatureFlagRow[]): Record<FeatureFlagKey, false> {
  const flags = Object.fromEntries(FEATURE_FLAG_KEYS.map((key) => [key, false])) as Record<
    FeatureFlagKey,
    false
  >;

  for (const row of rows) {
    // This assignment is deliberately constrained to false. Issue #4 has no flag enablement path.
    if (FEATURE_FLAG_KEYS.includes(row.flag_name) && row.enabled !== 0) {
      flags[row.flag_name] = false;
    }
  }
  return flags;
}

function playerViewFromRows(
  player: PlayerRow,
  preferences: PreferencesRow | undefined,
  locations: InventoryLocationRow[],
  flags: FeatureFlagRow[],
): PlayerView {
  return {
    playerId: player.player_id,
    handle: player.handle,
    version: player.version,
    level: player.level,
    experience: player.experience,
    stats: {
      vitality: player.vitality,
      maxVitality: player.max_vitality,
      focus: player.focus,
      maxFocus: player.max_focus,
      guard: player.guard,
      speed: player.speed,
      luck: player.luck,
    },
    preferences: preferences
      ? {
          locale: preferences.locale,
          theme: preferences.theme,
          presentation: preferences.presentation,
          reducedMotion: booleanFromSql(preferences.reduced_motion),
          imagesEnabled: booleanFromSql(preferences.images_enabled),
        }
      : DEFAULT_PREFERENCES,
    inventoryLocations: locations.map((location) => ({
      id: location.location_id,
      kind: location.location_kind,
      sortOrder: location.sort_order,
    })),
    featureFlags: featureFlagsFromRows(flags),
  };
}

function preferenceRowFromView(view: PlayerView): PreferencesRow {
  return {
    locale: view.preferences.locale,
    theme: view.preferences.theme,
    presentation: view.preferences.presentation,
    reduced_motion: view.preferences.reducedMotion ? 1 : 0,
    images_enabled: view.preferences.imagesEnabled ? 1 : 0,
  };
}

export class D1GuestDataRepository implements GuestDataRepository {
  constructor(private readonly db: D1Database) {}

  async authenticateSession(tokenHash: string, now: string): Promise<AuthenticatedSession | null> {
    const row = await this.db
      .prepare(
        `SELECT account_id, player_id, session_id, csrf_token_hash, expires_at
         FROM sessions
         WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
      )
      .bind(tokenHash, now)
      .first<SessionRow>();

    if (!row) return null;

    await this.db
      .prepare('UPDATE sessions SET last_seen_at = ? WHERE session_id = ?')
      .bind(now, row.session_id)
      .run();

    return {
      accountId: row.account_id,
      playerId: row.player_id,
      sessionId: row.session_id,
      csrfTokenHash: row.csrf_token_hash,
      expiresAt: row.expires_at,
    };
  }

  async createGuest(input: GuestSessionInput): Promise<void> {
    const statements = [
      this.db
        .prepare(
          `INSERT INTO accounts (account_id, account_kind, created_at)
           VALUES (?, 'guest', ?)`,
        )
        .bind(input.accountId, input.createdAt),
      this.db
        .prepare(
          `INSERT INTO players (
             player_id, account_id, handle, version, level, experience,
             vitality, max_vitality, focus, max_focus, guard, speed, luck,
             created_at, updated_at
           ) VALUES (?, ?, ?, 1, 1, 0, 10, 10, 3, 3, 0, 5, 0, ?, ?)`,
        )
        .bind(input.playerId, input.accountId, input.handle, input.createdAt, input.createdAt),
      this.db
        .prepare(
          `INSERT INTO sessions (
             session_id, account_id, player_id, token_hash, csrf_token_hash,
             created_at, expires_at, last_seen_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          input.sessionId,
          input.accountId,
          input.playerId,
          input.tokenHash,
          input.csrfTokenHash,
          input.createdAt,
          input.expiresAt,
          input.createdAt,
        ),
      this.db
        .prepare(
          `INSERT INTO player_preferences (
             player_id, locale, theme, presentation, reduced_motion, images_enabled,
             created_at, updated_at
           ) VALUES (?, 'ja-JP', 'retro', 'general', 0, 1, ?, ?)`,
        )
        .bind(input.playerId, input.createdAt, input.createdAt),
      this.db
        .prepare(
          `INSERT INTO inventory_locations
             (player_id, location_id, location_kind, sort_order, created_at)
           VALUES (?, 'inventory.default', 'inventory', 0, ?),
                  (?, 'vault.default', 'vault', 1, ?),
                  (?, 'equipment.default', 'equipment', 2, ?)`,
        )
        .bind(
          input.playerId,
          input.createdAt,
          input.playerId,
          input.createdAt,
          input.playerId,
          input.createdAt,
        ),
      ...FEATURE_FLAG_KEYS.map((flag) =>
        this.db
          .prepare(
            `INSERT INTO player_feature_flags (player_id, flag_name, enabled, updated_at)
             VALUES (?, ?, 0, ?)`,
          )
          .bind(input.playerId, flag, input.createdAt),
      ),
    ];

    await this.db.batch(statements);
  }

  async getPlayer(playerId: string): Promise<PlayerView | null> {
    const player = await this.db
      .prepare(
        `SELECT account_id, player_id, handle, version, level, experience,
                vitality, max_vitality, focus, max_focus, guard, speed, luck
         FROM players WHERE player_id = ?`,
      )
      .bind(playerId)
      .first<PlayerRow>();
    if (!player) return null;

    const results = await this.db.batch([
      this.db
        .prepare(
          `SELECT locale, theme, presentation, reduced_motion, images_enabled
           FROM player_preferences WHERE player_id = ?`,
        )
        .bind(playerId),
      this.db
        .prepare(
          `SELECT flag_name, enabled FROM player_feature_flags
           WHERE player_id = ? ORDER BY flag_name`,
        )
        .bind(playerId),
      this.db
        .prepare(
          `SELECT location_id, location_kind, sort_order FROM inventory_locations
           WHERE player_id = ? ORDER BY sort_order, location_id`,
        )
        .bind(playerId),
    ]);

    const preferences = results[0]?.results[0] as PreferencesRow | undefined;
    const flags = (results[1]?.results ?? []) as FeatureFlagRow[];
    const locations = (results[2]?.results ?? []) as InventoryLocationRow[];
    return playerViewFromRows(player, preferences, locations, flags);
  }

  async rotateSession(currentSessionId: string, next: GuestSessionInput): Promise<void> {
    await this.db.batch([
      this.db
        .prepare('UPDATE sessions SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL')
        .bind(next.createdAt, currentSessionId),
      this.db
        .prepare(
          `INSERT INTO sessions (
             session_id, account_id, player_id, token_hash, csrf_token_hash,
             created_at, expires_at, last_seen_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          next.sessionId,
          next.accountId,
          next.playerId,
          next.tokenHash,
          next.csrfTokenHash,
          next.createdAt,
          next.expiresAt,
          next.createdAt,
        ),
    ]);
  }

  async revokeSession(sessionId: string, now: string): Promise<void> {
    await this.db
      .prepare('UPDATE sessions SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL')
      .bind(now, sessionId)
      .run();
  }

  async resetGuest(accountId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare('DELETE FROM idempotency_records WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId),
      this.db
        .prepare(
          'DELETE FROM player_feature_flags WHERE player_id IN (SELECT player_id FROM players WHERE account_id = ?)',
        )
        .bind(accountId),
      this.db
        .prepare(
          'DELETE FROM inventory_locations WHERE player_id IN (SELECT player_id FROM players WHERE account_id = ?)',
        )
        .bind(accountId),
      this.db
        .prepare(
          'DELETE FROM player_preferences WHERE player_id IN (SELECT player_id FROM players WHERE account_id = ?)',
        )
        .bind(accountId),
      this.db.prepare('DELETE FROM players WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM accounts WHERE account_id = ?').bind(accountId),
    ]);
  }

  async updatePreferences(input: UpdatePreferencesInput): Promise<StoredMutationResult> {
    const existing = await this.getIdempotency(input);
    if (existing) {
      if (existing.input_hash !== input.inputHash) {
        throw new GuestRepositoryError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request.',
        );
      }
      if (existing.response_json === PENDING_RESPONSE) {
        throw new GuestRepositoryError(
          'IDEMPOTENCY_IN_PROGRESS',
          'The previous request is still being finalized; retry with the same key.',
        );
      }
      return { player: JSON.parse(existing.response_json) as PlayerView, replayed: true };
    }

    const current = await this.getPlayer(input.playerId);
    if (!current) {
      throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'The guest player no longer exists.');
    }

    const nextPreferences: PlayerPreferences = {
      ...current.preferences,
      ...input.patch,
    };
    const nextPlayer: PlayerView = {
      ...current,
      version: current.version + 1,
      preferences: nextPreferences,
    };
    const preferenceRow = preferenceRowFromView(nextPlayer);
    const responseJson = JSON.stringify(nextPlayer);
    const idempotencyWhere = `account_id = ? AND action = ? AND idempotency_key = ?`;
    const idempotencyValues = [input.accountId, input.action, input.idempotencyKey];
    const statements = [
      this.db
        .prepare(
          `DELETE FROM idempotency_records
           WHERE ${idempotencyWhere} AND expires_at <= ?`,
        )
        .bind(...idempotencyValues, input.now),
      this.db
        .prepare(
          `INSERT OR IGNORE INTO idempotency_records
             (account_id, action, idempotency_key, input_hash, response_json, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          input.accountId,
          input.action,
          input.idempotencyKey,
          input.inputHash,
          PENDING_RESPONSE,
          input.now,
          input.expiresAt,
        ),
      this.db
        .prepare(
          `UPDATE player_preferences
           SET locale = ?, theme = ?, presentation = ?, reduced_motion = ?, images_enabled = ?, updated_at = ?
           WHERE player_id = ? AND EXISTS (
             SELECT 1 FROM idempotency_records
             WHERE ${idempotencyWhere} AND response_json = ?
           )`,
        )
        .bind(
          preferenceRow.locale,
          preferenceRow.theme,
          preferenceRow.presentation,
          preferenceRow.reduced_motion,
          preferenceRow.images_enabled,
          input.now,
          input.playerId,
          ...idempotencyValues,
          PENDING_RESPONSE,
        ),
      this.db
        .prepare(
          `UPDATE players SET version = version + 1, updated_at = ?
           WHERE player_id = ? AND account_id = ? AND version = ? AND EXISTS (
             SELECT 1 FROM idempotency_records
             WHERE ${idempotencyWhere} AND response_json = ?
           )`,
        )
        .bind(
          input.now,
          input.playerId,
          input.accountId,
          current.version,
          ...idempotencyValues,
          PENDING_RESPONSE,
        ),
      this.db
        .prepare(
          `UPDATE idempotency_records SET response_json = ?
           WHERE ${idempotencyWhere} AND response_json = ?`,
        )
        .bind(responseJson, ...idempotencyValues, PENDING_RESPONSE),
    ];

    const results = await this.db.batch(statements);
    const playerUpdate = results[3]?.meta?.changes;
    const stored = await this.getIdempotency(input);
    if (typeof playerUpdate === 'number' && playerUpdate === 0) {
      if (stored && stored.input_hash !== input.inputHash) {
        throw new GuestRepositoryError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request.',
        );
      }
      if (stored && stored.response_json !== PENDING_RESPONSE) {
        return { player: JSON.parse(stored.response_json) as PlayerView, replayed: true };
      }
      throw new GuestRepositoryError(
        'PLAYER_STATE_CONFLICT',
        'The player changed while the preference update was being applied.',
      );
    }
    if (!stored || stored.response_json === PENDING_RESPONSE) {
      throw new GuestRepositoryError(
        'IDEMPOTENCY_IN_PROGRESS',
        'The preference update could not be finalized; retry with the same key.',
      );
    }
    return { player: JSON.parse(stored.response_json) as PlayerView, replayed: false };
  }

  async consumeRateLimit(input: RateLimitInput): Promise<boolean> {
    const result = await this.db
      .prepare(
        `INSERT INTO rate_limit_buckets (bucket_key, action, window_start, count, updated_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(bucket_key, action) DO UPDATE SET
           window_start = CASE
             WHEN rate_limit_buckets.window_start = excluded.window_start
             THEN rate_limit_buckets.window_start
             ELSE excluded.window_start
           END,
           count = CASE
             WHEN rate_limit_buckets.window_start = excluded.window_start
             THEN rate_limit_buckets.count + 1
             ELSE 1
           END,
           updated_at = excluded.updated_at
         WHERE rate_limit_buckets.window_start != excluded.window_start
            OR rate_limit_buckets.count < ?`,
      )
      .bind(input.bucketKey, input.action, input.windowStart, input.now, input.limit)
      .run();

    return Number(result.meta.changes ?? 0) > 0;
  }

  private async getIdempotency(input: UpdatePreferencesInput): Promise<IdempotencyRow | null> {
    return this.db
      .prepare(
        `SELECT input_hash, response_json, expires_at FROM idempotency_records
         WHERE account_id = ? AND action = ? AND idempotency_key = ? AND expires_at > ?`,
      )
      .bind(input.accountId, input.action, input.idempotencyKey, input.now)
      .first<IdempotencyRow>();
  }
}

export function createD1GuestRepository(db: D1Database): GuestDataRepository {
  return new D1GuestDataRepository(db);
}
