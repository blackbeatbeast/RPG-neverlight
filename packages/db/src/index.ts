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

export type ExplorationPhase = 'exploration' | 'encounter' | 'result' | 'complete' | 'expired';

export interface ExplorationEncounterView {
  encounterId: string;
  encounterVersion: string;
  pattern: string;
  status: 'active' | 'resolved';
  combatState: unknown;
  lastResolution: unknown | null;
}

/**
 * This is an internal repository view. `serverSeed` is deliberately removed by the Worker
 * response mapper before it crosses the browser trust boundary.
 */
export interface ExplorationRunView {
  routeRunId: string;
  routeId: string;
  routeVersion: string;
  phase: ExplorationPhase;
  version: number;
  nodeId: string;
  expiresAt: string;
  serverSeed: number | null;
  serverSeedHash: string | null;
  encounter: ExplorationEncounterView | null;
}

export interface ExplorationMutationInput {
  accountId: string;
  playerId: string;
  action: string;
  idempotencyKey: string;
  inputHash: string;
  now: string;
  expiresAt: string;
  routeRunId: string;
  expectedVersion?: number;
  routeId?: string;
  routeVersion?: string;
  nodeId?: string;
  routeSeed?: number;
  routeSeedHash?: string;
  encounterId?: string;
  encounterVersion?: string;
  pattern?: string;
  encounterSeed?: number;
  encounterSeedHash?: string;
  combatState?: unknown;
  resolutionId?: string;
  resolution?: unknown;
  rulesetVersion?: string;
  combatSeed?: number;
  inputStateHash?: string;
  outputStateHash?: string;
  resolutionHash?: string;
  phase?: Exclude<ExplorationPhase, 'expired'>;
}

export interface StoredExplorationMutationResult {
  run: ExplorationRunView;
  replayed: boolean;
}

export interface ExplorationDataRepository {
  getCurrentRoute(playerId: string, now: string): Promise<ExplorationRunView | null>;
  startRoute(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult>;
  chooseNode(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult>;
  resolveCombat(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult>;
  exitRoute(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult>;
}

export class GuestRepositoryError extends Error {
  constructor(
    public readonly code:
      | 'IDEMPOTENCY_KEY_REUSED'
      | 'IDEMPOTENCY_IN_PROGRESS'
      | 'PLAYER_STATE_CONFLICT'
      | 'PLAYER_NOT_FOUND'
      | 'ROUTE_NOT_FOUND'
      | 'ROUTE_STATE_CONFLICT'
      | 'ROUTE_EXPIRED'
      | 'INVALID_ROUTE'
      | 'ENCOUNTER_NOT_FOUND'
      | 'INVALID_COMBAT_STATE',
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

interface RouteRunRow {
  route_run_id: string;
  account_id: string;
  player_id: string;
  route_id: string;
  route_version: string;
  phase: Exclude<ExplorationPhase, 'expired'>;
  version: number;
  node_id: string;
  encounter_id: string | null;
  route_seed: number;
  route_seed_hash: string;
  expires_at: string;
}

interface EncounterRow {
  encounter_id: string;
  route_run_id: string;
  encounter_version: string;
  pattern: string;
  status: 'active' | 'resolved';
  encounter_seed: number;
  encounter_seed_hash: string;
  combat_state_json: string;
}

interface ResolutionRow {
  resolution_id: string;
  encounter_id: string;
  resolution_json: string;
}

interface ExplorationIdempotencyRow {
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

function parseStoredJson(value: string, code: 'INVALID_COMBAT_STATE' | 'ROUTE_NOT_FOUND'): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new GuestRepositoryError(code, '保存された探索状態を読み取れません。');
  }
}

function explorationView(
  route: RouteRunRow,
  encounter: EncounterRow | null,
  resolution: ResolutionRow | null,
  now: string,
): ExplorationRunView {
  const expired = route.phase !== 'complete' && route.expires_at <= now;
  return {
    routeRunId: route.route_run_id,
    routeId: route.route_id,
    routeVersion: route.route_version,
    phase: expired ? 'expired' : route.phase,
    version: route.version,
    nodeId: route.node_id,
    expiresAt: route.expires_at,
    serverSeed: encounter?.encounter_seed ?? route.route_seed,
    serverSeedHash: encounter?.encounter_seed_hash ?? route.route_seed_hash,
    encounter: encounter
      ? {
          encounterId: encounter.encounter_id,
          encounterVersion: encounter.encounter_version,
          pattern: encounter.pattern,
          status: encounter.status,
          combatState: parseStoredJson(encounter.combat_state_json, 'INVALID_COMBAT_STATE'),
          lastResolution: resolution
            ? parseStoredJson(resolution.resolution_json, 'INVALID_COMBAT_STATE')
            : null,
        }
      : null,
  };
}

function explorationViewForStorage(view: ExplorationRunView): string {
  return JSON.stringify({ ...view, serverSeed: null, serverSeedHash: null });
}

export class D1GuestDataRepository implements GuestDataRepository, ExplorationDataRepository {
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
      this.db
        .prepare(
          'DELETE FROM combat_resolutions WHERE route_run_id IN (SELECT route_run_id FROM route_runs WHERE account_id = ?)',
        )
        .bind(accountId),
      this.db
        .prepare(
          'DELETE FROM encounters WHERE route_run_id IN (SELECT route_run_id FROM route_runs WHERE account_id = ?)',
        )
        .bind(accountId),
      this.db.prepare('DELETE FROM route_runs WHERE account_id = ?').bind(accountId),
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

  async getCurrentRoute(playerId: string, now: string): Promise<ExplorationRunView | null> {
    const route = await this.db
      .prepare(
        `SELECT route_run_id, account_id, player_id, route_id, route_version, phase, version,
                node_id, encounter_id, route_seed, route_seed_hash, expires_at
         FROM route_runs
         WHERE player_id = ?
         ORDER BY created_at DESC, route_run_id DESC
         LIMIT 1`,
      )
      .bind(playerId)
      .first<RouteRunRow>();
    if (!route) return null;
    return this.loadExplorationView(route, now);
  }

  async startRoute(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = await this.claimExplorationIdempotency(input);
    if (replay) return replay;
    if (
      input.routeId === undefined ||
      input.routeVersion === undefined ||
      input.routeSeed === undefined ||
      input.routeSeedHash === undefined
    ) {
      await this.releaseExplorationIdempotency(input);
      throw new GuestRepositoryError('INVALID_ROUTE', 'ルート開始情報が不足しています。');
    }

    const route: RouteRunRow = {
      route_run_id: input.routeRunId,
      account_id: input.accountId,
      player_id: input.playerId,
      route_id: input.routeId,
      route_version: input.routeVersion,
      phase: 'exploration',
      version: 1,
      node_id: 'start',
      encounter_id: null,
      route_seed: input.routeSeed,
      route_seed_hash: input.routeSeedHash,
      expires_at: input.expiresAt,
    };
    const view = explorationView(route, null, null, input.now);
    try {
      await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO route_runs (
               route_run_id, account_id, player_id, route_id, route_version, phase, version,
               node_id, encounter_id, route_seed, route_seed_hash, expires_at, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, 'exploration', 1, 'start', NULL, ?, ?, ?, ?, ?)`,
          )
          .bind(
            route.route_run_id,
            route.account_id,
            route.player_id,
            route.route_id,
            route.route_version,
            route.route_seed,
            route.route_seed_hash,
            route.expires_at,
            input.now,
            input.now,
          ),
        this.explorationIdempotencyUpdate(input, explorationViewForStorage(view)),
      ]);
    } catch (error) {
      await this.releaseExplorationIdempotency(input);
      throw error;
    }
    return { run: view, replayed: false };
  }

  async chooseNode(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = await this.claimExplorationIdempotency(input);
    if (replay) return replay;
    try {
      const current = await this.getCurrentRoute(input.playerId, input.now);
      if (!current || current.routeRunId !== input.routeRunId) {
        throw new GuestRepositoryError('ROUTE_NOT_FOUND', '探索ルートが見つかりません。');
      }
      this.assertMutableRoute(current, input.expectedVersion, 'exploration');
      if (
        input.encounterId === undefined ||
        input.encounterVersion === undefined ||
        input.pattern === undefined ||
        input.encounterSeed === undefined ||
        input.encounterSeedHash === undefined ||
        input.combatState === undefined
      ) {
        throw new GuestRepositoryError('INVALID_ROUTE', '遭遇の開始情報が不足しています。');
      }

      const encounter: ExplorationEncounterView = {
        encounterId: input.encounterId,
        encounterVersion: input.encounterVersion,
        pattern: input.pattern,
        status: 'active',
        combatState: input.combatState,
        lastResolution: null,
      };
      const next: ExplorationRunView = {
        ...current,
        phase: 'encounter',
        version: current.version + 1,
        nodeId: 'encounter',
        serverSeed: input.encounterSeed,
        serverSeedHash: input.encounterSeedHash,
        encounter,
      };
      const result = await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO encounters (
               encounter_id, route_run_id, encounter_version, pattern, status,
               encounter_seed, encounter_seed_hash, combat_state_json, created_at, updated_at
             ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.encounterId,
            input.routeRunId,
            input.encounterVersion,
            input.pattern,
            input.encounterSeed,
            input.encounterSeedHash,
            JSON.stringify(input.combatState),
            input.now,
            input.now,
          ),
        this.db
          .prepare(
            `UPDATE route_runs
             SET phase = 'encounter', version = ?, node_id = 'encounter', encounter_id = ?, updated_at = ?
             WHERE route_run_id = ? AND player_id = ? AND version = ? AND expires_at > ?`,
          )
          .bind(
            next.version,
            input.encounterId,
            input.now,
            input.routeRunId,
            input.playerId,
            current.version,
            input.now,
          ),
        this.explorationIdempotencyUpdate(input, explorationViewForStorage(next)),
      ]);
      if (Number(result[1]?.meta.changes ?? 0) !== 1) {
        throw new GuestRepositoryError(
          'ROUTE_STATE_CONFLICT',
          '探索状態が更新されました。最新状態を取得してください。',
        );
      }
      return { run: next, replayed: false };
    } catch (error) {
      await this.releaseExplorationIdempotency(input);
      throw error;
    }
  }

  async resolveCombat(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = await this.claimExplorationIdempotency(input);
    if (replay) return replay;
    try {
      const current = await this.getCurrentRoute(input.playerId, input.now);
      if (!current || current.routeRunId !== input.routeRunId) {
        throw new GuestRepositoryError('ROUTE_NOT_FOUND', '探索ルートが見つかりません。');
      }
      this.assertMutableRoute(current, input.expectedVersion, 'encounter');
      if (
        !current.encounter ||
        input.encounterId !== current.encounter.encounterId ||
        input.combatState === undefined ||
        input.resolutionId === undefined ||
        input.resolution === undefined ||
        input.rulesetVersion === undefined ||
        input.combatSeed === undefined ||
        input.inputStateHash === undefined ||
        input.outputStateHash === undefined ||
        input.resolutionHash === undefined ||
        input.phase === undefined
      ) {
        throw new GuestRepositoryError('INVALID_COMBAT_STATE', '戦闘解決情報が不正です。');
      }

      const next: ExplorationRunView = {
        ...current,
        phase: input.phase,
        version: current.version + 1,
        nodeId: input.phase === 'result' ? 'result' : 'encounter',
        encounter: {
          ...current.encounter,
          status: input.phase === 'result' ? 'resolved' : 'active',
          combatState: input.combatState,
          lastResolution: input.resolution,
        },
      };
      const result = await this.db.batch([
        this.db
          .prepare(
            `UPDATE encounters
             SET status = ?, combat_state_json = ?, updated_at = ?
             WHERE encounter_id = ? AND route_run_id = ? AND status = 'active'`,
          )
          .bind(
            next.encounter?.status,
            JSON.stringify(input.combatState),
            input.now,
            input.encounterId,
            input.routeRunId,
          ),
        this.db
          .prepare(
            `INSERT INTO combat_resolutions (
               resolution_id, encounter_id, route_run_id, ruleset_version, combat_seed,
               input_state_hash, output_state_hash, resolution_hash, resolution_json, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.resolutionId,
            input.encounterId,
            input.routeRunId,
            input.rulesetVersion,
            input.combatSeed,
            input.inputStateHash,
            input.outputStateHash,
            input.resolutionHash,
            JSON.stringify(input.resolution),
            input.now,
          ),
        this.db
          .prepare(
            `UPDATE route_runs
             SET phase = ?, version = ?, node_id = ?, updated_at = ?
             WHERE route_run_id = ? AND player_id = ? AND version = ? AND expires_at > ?`,
          )
          .bind(
            input.phase,
            next.version,
            next.nodeId,
            input.now,
            input.routeRunId,
            input.playerId,
            current.version,
            input.now,
          ),
        this.explorationIdempotencyUpdate(input, explorationViewForStorage(next)),
      ]);
      if (
        Number(result[0]?.meta.changes ?? 0) !== 1 ||
        Number(result[2]?.meta.changes ?? 0) !== 1
      ) {
        throw new GuestRepositoryError(
          'ROUTE_STATE_CONFLICT',
          '戦闘状態が更新されました。最新状態を取得してください。',
        );
      }
      return { run: next, replayed: false };
    } catch (error) {
      await this.releaseExplorationIdempotency(input);
      throw error;
    }
  }

  async exitRoute(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = await this.claimExplorationIdempotency(input);
    if (replay) return replay;
    try {
      const current = await this.getCurrentRoute(input.playerId, input.now);
      if (!current || current.routeRunId !== input.routeRunId) {
        throw new GuestRepositoryError('ROUTE_NOT_FOUND', '探索ルートが見つかりません。');
      }
      this.assertMutableRoute(current, input.expectedVersion, 'exit');
      if (current.phase !== 'exploration' && current.phase !== 'result') {
        throw new GuestRepositoryError('INVALID_ROUTE', 'この状態からは退出できません。');
      }
      const next: ExplorationRunView = {
        ...current,
        phase: 'complete',
        version: current.version + 1,
        nodeId: 'exit',
      };
      const result = await this.db.batch([
        this.db
          .prepare(
            `UPDATE route_runs
             SET phase = 'complete', version = ?, node_id = 'exit', updated_at = ?
             WHERE route_run_id = ? AND player_id = ? AND version = ? AND expires_at > ?`,
          )
          .bind(
            next.version,
            input.now,
            input.routeRunId,
            input.playerId,
            current.version,
            input.now,
          ),
        this.explorationIdempotencyUpdate(input, explorationViewForStorage(next)),
      ]);
      if (Number(result[0]?.meta.changes ?? 0) !== 1) {
        throw new GuestRepositoryError(
          'ROUTE_STATE_CONFLICT',
          '退出状態が更新されました。最新状態を取得してください。',
        );
      }
      return { run: next, replayed: false };
    } catch (error) {
      await this.releaseExplorationIdempotency(input);
      throw error;
    }
  }

  private async loadExplorationView(route: RouteRunRow, now: string): Promise<ExplorationRunView> {
    const results = await this.db.batch([
      this.db
        .prepare(
          `SELECT encounter_id, route_run_id, encounter_version, pattern, status,
                  encounter_seed, encounter_seed_hash, combat_state_json
           FROM encounters WHERE encounter_id = ?`,
        )
        .bind(route.encounter_id),
      this.db
        .prepare(
          `SELECT resolution_id, encounter_id, resolution_json
           FROM combat_resolutions
           WHERE encounter_id = ?
           ORDER BY created_at DESC, resolution_id DESC
           LIMIT 1`,
        )
        .bind(route.encounter_id),
    ]);
    const encounter = (results[0]?.results[0] as EncounterRow | undefined) ?? null;
    const resolution = (results[1]?.results[0] as ResolutionRow | undefined) ?? null;
    return explorationView(route, encounter, resolution, now);
  }

  private assertMutableRoute(
    route: ExplorationRunView,
    expectedVersion: number | undefined,
    phase: 'exploration' | 'encounter' | 'exit',
  ): void {
    if (route.phase === 'expired') {
      throw new GuestRepositoryError('ROUTE_EXPIRED', 'この探索ルートは期限切れです。');
    }
    if (route.phase === 'complete') {
      throw new GuestRepositoryError('INVALID_ROUTE', 'この探索ルートは完了しています。');
    }
    if (expectedVersion !== route.version) {
      throw new GuestRepositoryError(
        'ROUTE_STATE_CONFLICT',
        '探索状態が更新されました。最新状態を取得してください。',
      );
    }
    if (phase !== 'exit' && route.phase !== phase) {
      throw new GuestRepositoryError('INVALID_ROUTE', '探索状態の順序が不正です。');
    }
  }

  private async claimExplorationIdempotency(
    input: ExplorationMutationInput,
  ): Promise<StoredExplorationMutationResult | null> {
    const existing = await this.getExplorationIdempotency(input);
    if (existing) {
      if (existing.input_hash !== input.inputHash) {
        throw new GuestRepositoryError(
          'IDEMPOTENCY_KEY_REUSED',
          '同じIdempotency-Keyに別の内容は指定できません。',
        );
      }
      if (existing.response_json === PENDING_RESPONSE) {
        throw new GuestRepositoryError(
          'IDEMPOTENCY_IN_PROGRESS',
          '同じ操作が処理中です。同じキーで再試行してください。',
        );
      }
      return {
        run: JSON.parse(existing.response_json) as ExplorationRunView,
        replayed: true,
      };
    }

    const idempotencyWhere = 'account_id = ? AND action = ? AND idempotency_key = ?';
    const values = [input.accountId, input.action, input.idempotencyKey];
    const results = await this.db.batch([
      this.db
        .prepare(`DELETE FROM idempotency_records WHERE ${idempotencyWhere} AND expires_at <= ?`)
        .bind(...values, input.now),
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
    ]);
    if (Number(results[1]?.meta.changes ?? 0) === 1) return null;

    const raced = await this.getExplorationIdempotency(input);
    if (raced?.input_hash !== input.inputHash) {
      throw new GuestRepositoryError(
        'IDEMPOTENCY_KEY_REUSED',
        '同じIdempotency-Keyに別の内容は指定できません。',
      );
    }
    if (!raced || raced.response_json === PENDING_RESPONSE) {
      throw new GuestRepositoryError(
        'IDEMPOTENCY_IN_PROGRESS',
        '同じ操作が処理中です。同じキーで再試行してください。',
      );
    }
    return { run: JSON.parse(raced.response_json) as ExplorationRunView, replayed: true };
  }

  private explorationIdempotencyUpdate(
    input: ExplorationMutationInput,
    responseJson: string,
  ): D1PreparedStatement {
    return this.db
      .prepare(
        `UPDATE idempotency_records SET response_json = ?
         WHERE account_id = ? AND action = ? AND idempotency_key = ? AND response_json = ?`,
      )
      .bind(responseJson, input.accountId, input.action, input.idempotencyKey, PENDING_RESPONSE);
  }

  private async releaseExplorationIdempotency(input: ExplorationMutationInput): Promise<void> {
    await this.db
      .prepare(
        `DELETE FROM idempotency_records
         WHERE account_id = ? AND action = ? AND idempotency_key = ? AND response_json = ?`,
      )
      .bind(input.accountId, input.action, input.idempotencyKey, PENDING_RESPONSE)
      .run();
  }

  private async getExplorationIdempotency(
    input: ExplorationMutationInput,
  ): Promise<ExplorationIdempotencyRow | null> {
    return this.db
      .prepare(
        `SELECT input_hash, response_json, expires_at FROM idempotency_records
         WHERE account_id = ? AND action = ? AND idempotency_key = ? AND expires_at > ?`,
      )
      .bind(input.accountId, input.action, input.idempotencyKey, input.now)
      .first<ExplorationIdempotencyRow>();
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

export function createD1GuestRepository(db: D1Database): D1GuestDataRepository {
  return new D1GuestDataRepository(db);
}
