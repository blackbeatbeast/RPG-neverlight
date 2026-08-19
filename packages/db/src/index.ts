/// <reference types="@cloudflare/workers-types" />

import {
  calculateSalvage,
  type LootItemInstance,
  type LootItemSlot,
  type LootRarity,
} from '@neverlight/game-core';

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

export interface CodexProgressView {
  discoveryCount: number;
  entryId: string;
  entryType: 'item' | 'affix' | 'unique' | 'enemy' | 'location';
  firstSeenAt: string;
}

export interface InventoryView {
  capacity: number;
  codex: CodexProgressView[];
  items: LootItemInstance[];
  materials: Record<string, number>;
  playerVersion: number;
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

export interface InventoryMutationInput {
  accountId: string;
  action: string;
  confirm?: boolean;
  contentVersion?: string;
  expectedVersion?: number;
  expiresAt: string;
  favorite?: boolean;
  idempotencyKey: string;
  inputHash: string;
  item?: LootItemInstance;
  itemId?: string;
  itemIds?: readonly string[];
  ledgerEventIds?: readonly string[];
  locked?: boolean;
  mintSeed?: number;
  mode?: 'equip' | 'unequip';
  now: string;
  playerId: string;
  rulesetVersion?: string;
  sourceRef?: string;
  transactionId?: string;
  unlock?: boolean;
}

export interface StoredInventoryMutationResult {
  inventory: InventoryView;
  ledgerEventIds: string[];
  replayed: boolean;
}

export interface InventoryDataRepository {
  claimLoot(input: InventoryMutationInput): Promise<StoredInventoryMutationResult>;
  equipItem(input: InventoryMutationInput): Promise<StoredInventoryMutationResult>;
  getInventory(playerId: string): Promise<InventoryView | null>;
  markItem(input: InventoryMutationInput): Promise<StoredInventoryMutationResult>;
  salvageItems(input: InventoryMutationInput): Promise<StoredInventoryMutationResult>;
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
      | 'INVALID_COMBAT_STATE'
      | 'INVENTORY_FULL'
      | 'ITEM_NOT_FOUND'
      | 'ITEM_EQUIPPED'
      | 'ITEM_PROTECTED'
      | 'CONFIRMATION_REQUIRED'
      | 'INVALID_INVENTORY_REQUEST'
      | 'INVENTORY_STATE_CONFLICT',
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

interface ItemRow {
  account_id: string;
  affixes_json: string;
  base_id: string;
  base_stats_json: string;
  bind_state: LootItemInstance['bindState'];
  content_version: string;
  created_at: string;
  equipment_slot: LootItemSlot | null;
  favorite: number;
  item_id: string;
  item_level: number;
  location: LootItemInstance['location'];
  locked: number;
  player_id: string;
  provenance_json: string;
  quality: number;
  rarity: LootRarity;
  ruleset_version: string;
  slot: LootItemSlot;
  source_ref: string;
  status: LootItemInstance['status'];
  unique_rule: string | null;
}

interface MaterialRow {
  material_key: string;
  quantity: number;
}

interface CodexProgressRow {
  discovery_count: number;
  entry_id: string;
  entry_type: CodexProgressView['entryType'];
  first_seen_at: string;
}

interface InventoryIdempotencyRow {
  input_hash: string;
  response_json: string;
  expires_at: string;
}

interface StoredInventoryResponse {
  inventory: InventoryView;
  ledgerEventIds: string[];
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

function parseInventoryJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', `${label}を読み取れません。`);
  }
}

function normalizeInventoryMutationError(error: unknown): unknown {
  if (error instanceof Error && error.message.toLowerCase().includes('malformed json')) {
    return new GuestRepositoryError(
      'INVENTORY_STATE_CONFLICT',
      '持ち物の状態が競合しました。最新状態を取得してください。',
    );
  }
  return error;
}

function inventoryItemFromRow(row: ItemRow): LootItemInstance {
  return {
    affixes: parseInventoryJson<LootItemInstance['affixes']>(row.affixes_json, 'affix'),
    baseId: row.base_id,
    baseStats: parseInventoryJson<LootItemInstance['baseStats']>(row.base_stats_json, 'base stat'),
    bindState: row.bind_state,
    equipmentSlot: row.equipment_slot,
    favorite: booleanFromSql(row.favorite),
    id: row.item_id,
    itemLevel: row.item_level,
    location: row.location,
    locked: booleanFromSql(row.locked),
    provenance: parseInventoryJson<LootItemInstance['provenance']>(
      row.provenance_json,
      'provenance',
    ),
    quality: row.quality,
    rarity: row.rarity,
    slot: row.slot,
    status: row.status,
    uniqueRule: row.unique_rule,
  };
}

function inventoryViewFromRows(
  playerVersion: number,
  itemRows: ItemRow[],
  materialRows: MaterialRow[],
  codexRows: CodexProgressRow[],
): InventoryView {
  return {
    capacity: 30,
    codex: codexRows.map((row) => ({
      discoveryCount: row.discovery_count,
      entryId: row.entry_id,
      entryType: row.entry_type,
      firstSeenAt: row.first_seen_at,
    })),
    items: itemRows.map(inventoryItemFromRow),
    materials: Object.fromEntries(materialRows.map((row) => [row.material_key, row.quantity])),
    playerVersion,
  };
}

function storedInventoryResponse(value: StoredInventoryResponse): string {
  return JSON.stringify(value);
}

function codexEntriesForItem(
  item: LootItemInstance,
): Array<{ entryId: string; entryType: CodexProgressView['entryType'] }> {
  const entries: Array<{ entryId: string; entryType: CodexProgressView['entryType'] }> = [
    { entryId: item.baseId, entryType: 'item' as const },
    ...item.affixes.map((affix) => ({ entryId: affix.id, entryType: 'affix' as const })),
  ];
  if (item.uniqueRule) entries.push({ entryId: item.uniqueRule, entryType: 'unique' });
  return entries.filter(
    (entry, index) =>
      entries.findIndex(
        (candidate) =>
          candidate.entryType === entry.entryType && candidate.entryId === entry.entryId,
      ) === index,
  );
}

function addCodexEntries(
  current: readonly CodexProgressView[],
  item: LootItemInstance,
  now: string,
): CodexProgressView[] {
  const next = current.map((entry) => ({ ...entry }));
  for (const candidate of codexEntriesForItem(item)) {
    const existing = next.find(
      (entry) => entry.entryType === candidate.entryType && entry.entryId === candidate.entryId,
    );
    if (existing) existing.discoveryCount += 1;
    else {
      next.push({
        discoveryCount: 1,
        entryId: candidate.entryId,
        entryType: candidate.entryType,
        firstSeenAt: now,
      });
    }
  }
  return next.sort((left, right) =>
    `${left.entryType}:${left.entryId}`.localeCompare(`${right.entryType}:${right.entryId}`),
  );
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

export class D1GuestDataRepository
  implements GuestDataRepository, ExplorationDataRepository, InventoryDataRepository
{
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

  async getInventory(playerId: string): Promise<InventoryView | null> {
    const player = await this.db
      .prepare('SELECT version FROM players WHERE player_id = ?')
      .bind(playerId)
      .first<{ version: number }>();
    if (!player) return null;

    const results = await this.db.batch([
      this.db
        .prepare(
          `SELECT item_id, account_id, player_id, base_id, slot, item_level, rarity, quality,
                  base_stats_json, affixes_json, unique_rule, bind_state, location, equipment_slot,
                  locked, favorite, status, provenance_json, ruleset_version, content_version,
                  source_ref, created_at
           FROM item_instances
           WHERE player_id = ?
           ORDER BY status ASC, created_at DESC, item_id DESC`,
        )
        .bind(playerId),
      this.db
        .prepare(
          `SELECT material_key, quantity
           FROM material_balances WHERE player_id = ? ORDER BY material_key`,
        )
        .bind(playerId),
      this.db
        .prepare(
          `SELECT entry_type, entry_id, first_seen_at, discovery_count
           FROM codex_progress WHERE player_id = ? ORDER BY entry_type, entry_id`,
        )
        .bind(playerId),
    ]);
    const items = (results[0]?.results ?? []) as ItemRow[];
    const materials = (results[1]?.results ?? []) as MaterialRow[];
    const codex = (results[2]?.results ?? []) as CodexProgressRow[];
    return inventoryViewFromRows(player.version, items, materials, codex);
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
      this.db.prepare('DELETE FROM economy_ledger WHERE account_id = ?').bind(accountId),
      this.db.prepare('DELETE FROM item_instances WHERE account_id = ?').bind(accountId),
      this.db
        .prepare(
          'DELETE FROM material_balances WHERE player_id IN (SELECT player_id FROM players WHERE account_id = ?)',
        )
        .bind(accountId),
      this.db
        .prepare(
          'DELETE FROM codex_progress WHERE player_id IN (SELECT player_id FROM players WHERE account_id = ?)',
        )
        .bind(accountId),
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

  async claimLoot(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = await this.claimInventoryIdempotency(input);
    if (replay) return replay;
    try {
      if (
        !input.item ||
        input.mintSeed === undefined ||
        !input.sourceRef ||
        !input.transactionId ||
        input.ledgerEventIds?.length !== 1
      ) {
        throw new GuestRepositoryError(
          'INVALID_INVENTORY_REQUEST',
          'ドロップ情報が不足しています。',
        );
      }
      const current = await this.getInventory(input.playerId);
      if (!current)
        throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'プレイヤーが見つかりません。');
      if (current.items.filter((item) => item.status === 'active').length >= current.capacity) {
        throw new GuestRepositoryError('INVENTORY_FULL', '持ち物の空きがありません。');
      }

      const next: InventoryView = {
        ...current,
        codex: addCodexEntries(current.codex, input.item, input.now),
        items: [input.item, ...current.items],
        playerVersion: current.playerVersion + 1,
      };
      const ledgerEventId = input.ledgerEventIds[0]!;
      const statements: D1PreparedStatement[] = [
        this.db
          .prepare(
            `INSERT INTO item_instances (
               item_id, account_id, player_id, base_id, slot, item_level, rarity, quality,
               base_stats_json, affixes_json, unique_rule, bind_state, location, equipment_slot,
               locked, favorite, status, provenance_json, ruleset_version, content_version,
               mint_seed, source_ref, created_at, updated_at, salvaged_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, NULL)`,
          )
          .bind(
            input.item.id,
            input.accountId,
            input.playerId,
            input.item.baseId,
            input.item.slot,
            input.item.itemLevel,
            input.item.rarity,
            input.item.quality,
            JSON.stringify(input.item.baseStats),
            JSON.stringify(input.item.affixes),
            input.item.uniqueRule,
            input.item.bindState,
            input.item.location,
            input.item.equipmentSlot,
            input.item.locked ? 1 : 0,
            input.item.favorite ? 1 : 0,
            JSON.stringify(input.item.provenance),
            input.item.provenance.rulesetVersion,
            input.item.provenance.contentVersion,
            input.mintSeed,
            input.sourceRef,
            input.now,
            input.now,
          ),
        this.db
          .prepare(
            `INSERT INTO economy_ledger (
               ledger_event_id, transaction_id, account_id, player_id, asset_type,
               asset_instance_id, material_key, quantity_delta, reason_code, source_ref_type,
               source_ref_id, ruleset_version, content_version, idempotency_key_hash,
               metadata_json, created_at
             ) VALUES (?, ?, ?, ?, 'item', ?, NULL, 1, 'LOOT_ITEM_MINT', 'loot', ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            ledgerEventId,
            input.transactionId,
            input.accountId,
            input.playerId,
            input.item.id,
            input.sourceRef,
            input.item.provenance.rulesetVersion,
            input.item.provenance.contentVersion,
            input.inputHash,
            JSON.stringify({
              affixIds: input.item.affixes.map((affix) => affix.id),
              rarity: input.item.rarity,
            }),
            input.now,
          ),
        ...codexEntriesForItem(input.item).map(({ entryId, entryType }) =>
          this.db
            .prepare(
              `INSERT INTO codex_progress (player_id, entry_type, entry_id, first_seen_at, discovery_count)
               VALUES (?, ?, ?, ?, 1)
               ON CONFLICT(player_id, entry_type, entry_id)
               DO UPDATE SET discovery_count = codex_progress.discovery_count + 1`,
            )
            .bind(input.playerId, entryType, entryId, input.now),
        ),
        this.inventoryIdempotencyUpdate(
          input,
          storedInventoryResponse({ inventory: next, ledgerEventIds: [ledgerEventId] }),
        ),
        this.db
          .prepare(
            `UPDATE players SET version = ?, updated_at = ?
             WHERE player_id = ? AND account_id = ? AND version = ?`,
          )
          .bind(
            next.playerVersion,
            input.now,
            input.playerId,
            input.accountId,
            current.playerVersion,
          ),
        this.mutationGuard(),
      ];
      const results = await this.db.batch(statements);
      const playerUpdate = results[statements.length - 2]?.meta?.changes;
      if (Number(playerUpdate ?? 0) !== 1) {
        throw new GuestRepositoryError(
          'INVENTORY_STATE_CONFLICT',
          '持ち物の状態が更新されました。最新状態を取得してください。',
        );
      }
      return { inventory: next, ledgerEventIds: [ledgerEventId], replayed: false };
    } catch (error) {
      await this.releaseInventoryIdempotency(input);
      throw normalizeInventoryMutationError(error);
    }
  }

  async equipItem(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = await this.claimInventoryIdempotency(input);
    if (replay) return replay;
    try {
      if (!input.itemId || !input.mode || input.expectedVersion === undefined) {
        throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', '装備操作が不足しています。');
      }
      const current = await this.getInventory(input.playerId);
      if (!current)
        throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'プレイヤーが見つかりません。');
      if (current.playerVersion !== input.expectedVersion) {
        throw new GuestRepositoryError(
          'INVENTORY_STATE_CONFLICT',
          '持ち物のversionが古くなっています。',
        );
      }
      const selected = current.items.find(
        (item) => item.id === input.itemId && item.status === 'active',
      );
      if (!selected)
        throw new GuestRepositoryError('ITEM_NOT_FOUND', '対象アイテムが見つかりません。');

      let nextItems: LootItemInstance[];
      const statements: D1PreparedStatement[] = [];
      if (input.mode === 'equip') {
        if (selected.location === 'equipment') {
          throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', 'そのアイテムは装備中です。');
        }
        const replaced = current.items.find(
          (item) =>
            item.status === 'active' &&
            item.location === 'equipment' &&
            item.equipmentSlot === selected.slot,
        );
        nextItems = current.items.map((item) => {
          if (replaced && item.id === replaced.id) {
            return {
              ...item,
              bindState: 'account-bound',
              equipmentSlot: null,
              location: 'inventory',
            };
          }
          if (item.id === selected.id) {
            return {
              ...item,
              bindState: 'account-bound',
              equipmentSlot: item.slot,
              location: 'equipment',
            };
          }
          return item;
        });
        if (replaced) {
          statements.push(
            this.db
              .prepare(
                `UPDATE item_instances SET location = 'inventory', equipment_slot = NULL,
                        bind_state = 'account-bound', updated_at = ?
                 WHERE item_id = ? AND player_id = ? AND status = 'active'`,
              )
              .bind(input.now, replaced.id, input.playerId),
          );
        }
        statements.push(
          this.db
            .prepare(
              `UPDATE item_instances SET location = 'equipment', equipment_slot = ?,
                      bind_state = 'account-bound', updated_at = ?
               WHERE item_id = ? AND player_id = ? AND status = 'active'`,
            )
            .bind(selected.slot, input.now, selected.id, input.playerId),
        );
      } else {
        if (selected.location !== 'equipment') {
          throw new GuestRepositoryError(
            'INVALID_INVENTORY_REQUEST',
            'そのアイテムは装備されていません。',
          );
        }
        nextItems = current.items.map((item) =>
          item.id === selected.id ? { ...item, equipmentSlot: null, location: 'inventory' } : item,
        );
        statements.push(
          this.db
            .prepare(
              `UPDATE item_instances SET location = 'inventory', equipment_slot = NULL,
                      updated_at = ?
               WHERE item_id = ? AND player_id = ? AND status = 'active' AND location = 'equipment'`,
            )
            .bind(input.now, selected.id, input.playerId),
        );
      }

      const next: InventoryView = {
        ...current,
        items: nextItems,
        playerVersion: current.playerVersion + 1,
      };
      statements.push(
        this.inventoryIdempotencyUpdate(
          input,
          storedInventoryResponse({ inventory: next, ledgerEventIds: [] }),
        ),
        this.db
          .prepare(
            `UPDATE players SET version = ?, updated_at = ?
             WHERE player_id = ? AND account_id = ? AND version = ?`,
          )
          .bind(
            next.playerVersion,
            input.now,
            input.playerId,
            input.accountId,
            current.playerVersion,
          ),
        this.mutationGuard(),
      );
      const results = await this.db.batch(statements);
      const playerUpdate = results[statements.length - 2]?.meta?.changes;
      if (Number(playerUpdate ?? 0) !== 1) {
        throw new GuestRepositoryError('INVENTORY_STATE_CONFLICT', '装備状態が競合しました。');
      }
      return { inventory: next, ledgerEventIds: [], replayed: false };
    } catch (error) {
      await this.releaseInventoryIdempotency(input);
      throw normalizeInventoryMutationError(error);
    }
  }

  async markItem(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = await this.claimInventoryIdempotency(input);
    if (replay) return replay;
    try {
      if (
        !input.itemId ||
        input.expectedVersion === undefined ||
        input.locked === undefined ||
        input.favorite === undefined
      ) {
        throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', '保護設定が不足しています。');
      }
      const current = await this.getInventory(input.playerId);
      if (!current)
        throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'プレイヤーが見つかりません。');
      if (current.playerVersion !== input.expectedVersion) {
        throw new GuestRepositoryError(
          'INVENTORY_STATE_CONFLICT',
          '持ち物のversionが古くなっています。',
        );
      }
      const item = current.items.find(
        (candidate) => candidate.id === input.itemId && candidate.status === 'active',
      );
      if (!item) throw new GuestRepositoryError('ITEM_NOT_FOUND', '対象アイテムが見つかりません。');
      const next: InventoryView = {
        ...current,
        items: current.items.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, favorite: input.favorite!, locked: input.locked! }
            : candidate,
        ),
        playerVersion: current.playerVersion + 1,
      };
      const results = await this.db.batch([
        this.db
          .prepare(
            `UPDATE item_instances SET locked = ?, favorite = ?, updated_at = ?
             WHERE item_id = ? AND player_id = ? AND status = 'active'`,
          )
          .bind(input.locked ? 1 : 0, input.favorite ? 1 : 0, input.now, item.id, input.playerId),
        this.inventoryIdempotencyUpdate(
          input,
          storedInventoryResponse({ inventory: next, ledgerEventIds: [] }),
        ),
        this.db
          .prepare(
            `UPDATE players SET version = ?, updated_at = ?
             WHERE player_id = ? AND account_id = ? AND version = ?`,
          )
          .bind(
            next.playerVersion,
            input.now,
            input.playerId,
            input.accountId,
            current.playerVersion,
          ),
        this.mutationGuard(),
      ]);
      if (Number(results[results.length - 2]?.meta?.changes ?? 0) !== 1) {
        throw new GuestRepositoryError('INVENTORY_STATE_CONFLICT', '保護設定が競合しました。');
      }
      return { inventory: next, ledgerEventIds: [], replayed: false };
    } catch (error) {
      await this.releaseInventoryIdempotency(input);
      throw normalizeInventoryMutationError(error);
    }
  }

  async salvageItems(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = await this.claimInventoryIdempotency(input);
    if (replay) return replay;
    try {
      if (
        !input.itemIds ||
        input.itemIds.length === 0 ||
        input.itemIds.length > 20 ||
        input.expectedVersion === undefined ||
        input.confirm === undefined ||
        input.unlock === undefined ||
        !input.transactionId ||
        !input.ledgerEventIds ||
        input.ledgerEventIds.length !== input.itemIds.length + 1
      ) {
        throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', '分解対象が不正です。');
      }
      if (new Set(input.itemIds).size !== input.itemIds.length) {
        throw new GuestRepositoryError(
          'INVALID_INVENTORY_REQUEST',
          '同じアイテムを重複指定できません。',
        );
      }
      const current = await this.getInventory(input.playerId);
      if (!current)
        throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'プレイヤーが見つかりません。');
      if (current.playerVersion !== input.expectedVersion) {
        throw new GuestRepositoryError(
          'INVENTORY_STATE_CONFLICT',
          '持ち物のversionが古くなっています。',
        );
      }
      const selected = input.itemIds.map((itemId) => {
        const item = current.items.find(
          (candidate) => candidate.id === itemId && candidate.status === 'active',
        );
        if (!item) throw new GuestRepositoryError('ITEM_NOT_FOUND', '分解対象が見つかりません。');
        if (item.location === 'equipment') {
          throw new GuestRepositoryError('ITEM_EQUIPPED', '装備中のアイテムは先に外してください。');
        }
        if (['rare', 'unique', 'relic'].includes(item.rarity) && !input.confirm) {
          throw new GuestRepositoryError('CONFIRMATION_REQUIRED', 'Rare以上は明示確認が必要です。');
        }
        if ((item.locked || item.favorite) && !input.unlock) {
          throw new GuestRepositoryError(
            'ITEM_PROTECTED',
            'ロックまたはfavorite保護を解除してください。',
          );
        }
        return item;
      });
      const materialDelta = selected.reduce(
        (total, item) => total + calculateSalvage(item).quantity,
        0,
      );
      const materialKey = 'material.scrap';
      const next: InventoryView = {
        ...current,
        items: current.items.map((item) =>
          selected.some((candidate) => candidate.id === item.id)
            ? {
                ...item,
                equipmentSlot: null,
                favorite: false,
                location: 'inventory',
                locked: false,
                status: 'salvaged',
              }
            : item,
        ),
        materials: {
          ...current.materials,
          [materialKey]: (current.materials[materialKey] ?? 0) + materialDelta,
        },
        playerVersion: current.playerVersion + 1,
      };
      const statements: D1PreparedStatement[] = [];
      for (const [index, item] of selected.entries()) {
        const eventId = input.ledgerEventIds[index]!;
        statements.push(
          this.db
            .prepare(
              `UPDATE item_instances
               SET status = 'salvaged', location = 'inventory', equipment_slot = NULL,
                   locked = 0, favorite = 0, salvaged_at = ?, updated_at = ?
               WHERE item_id = ? AND player_id = ? AND status = 'active'`,
            )
            .bind(input.now, input.now, item.id, input.playerId),
          this.db
            .prepare(
              `INSERT INTO economy_ledger (
                 ledger_event_id, transaction_id, account_id, player_id, asset_type,
                 asset_instance_id, material_key, quantity_delta, reason_code, source_ref_type,
                 source_ref_id, ruleset_version, content_version, idempotency_key_hash,
                 metadata_json, created_at
               ) VALUES (?, ?, ?, ?, 'item', ?, NULL, -1, 'ITEM_SALVAGE_CONSUME', 'salvage', ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              eventId,
              input.transactionId,
              input.accountId,
              input.playerId,
              item.id,
              input.sourceRef ?? 'inventory.salvage',
              item.provenance.rulesetVersion,
              item.provenance.contentVersion,
              input.inputHash,
              JSON.stringify({ rarity: item.rarity, scrap: calculateSalvage(item).quantity }),
              input.now,
            ),
        );
      }
      const materialEventId = input.ledgerEventIds.at(-1)!;
      statements.push(
        this.db
          .prepare(
            `INSERT INTO material_balances (player_id, material_key, quantity, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(player_id, material_key)
             DO UPDATE SET quantity = material_balances.quantity + excluded.quantity,
                           updated_at = excluded.updated_at`,
          )
          .bind(input.playerId, materialKey, materialDelta, input.now),
        this.db
          .prepare(
            `INSERT INTO economy_ledger (
               ledger_event_id, transaction_id, account_id, player_id, asset_type,
               asset_instance_id, material_key, quantity_delta, reason_code, source_ref_type,
               source_ref_id, ruleset_version, content_version, idempotency_key_hash,
               metadata_json, created_at
             ) VALUES (?, ?, ?, ?, 'material', NULL, ?, ?, 'MATERIAL_SALVAGE_GRANT', 'salvage', ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            materialEventId,
            input.transactionId,
            input.accountId,
            input.playerId,
            materialKey,
            materialDelta,
            input.sourceRef ?? 'inventory.salvage',
            '1.0.0',
            '0.1.0',
            input.inputHash,
            JSON.stringify({ itemIds: input.itemIds, quantity: materialDelta }),
            input.now,
          ),
        this.inventoryIdempotencyUpdate(
          input,
          storedInventoryResponse({ inventory: next, ledgerEventIds: [...input.ledgerEventIds] }),
        ),
        this.db
          .prepare(
            `UPDATE players SET version = ?, updated_at = ?
             WHERE player_id = ? AND account_id = ? AND version = ?`,
          )
          .bind(
            next.playerVersion,
            input.now,
            input.playerId,
            input.accountId,
            current.playerVersion,
          ),
        this.mutationGuard(),
      );
      const results = await this.db.batch(statements);
      const playerUpdate = results[statements.length - 2]?.meta?.changes;
      if (Number(playerUpdate ?? 0) !== 1) {
        throw new GuestRepositoryError('INVENTORY_STATE_CONFLICT', '分解状態が競合しました。');
      }
      return { inventory: next, ledgerEventIds: [...input.ledgerEventIds], replayed: false };
    } catch (error) {
      await this.releaseInventoryIdempotency(input);
      throw normalizeInventoryMutationError(error);
    }
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

  private async claimInventoryIdempotency(
    input: InventoryMutationInput,
  ): Promise<StoredInventoryMutationResult | null> {
    const existing = await this.getInventoryIdempotency(input);
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
      const stored = parseInventoryJson<StoredInventoryResponse>(
        existing.response_json,
        '保存されたinventory結果',
      );
      return { ...stored, replayed: true };
    }
    const where = 'account_id = ? AND action = ? AND idempotency_key = ?';
    const values = [input.accountId, input.action, input.idempotencyKey];
    const results = await this.db.batch([
      this.db
        .prepare(`DELETE FROM idempotency_records WHERE ${where} AND expires_at <= ?`)
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
    if (Number(results[1]?.meta?.changes ?? 0) === 1) return null;
    const raced = await this.getInventoryIdempotency(input);
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
    const stored = parseInventoryJson<StoredInventoryResponse>(
      raced.response_json,
      '保存されたinventory結果',
    );
    return { ...stored, replayed: true };
  }

  private inventoryIdempotencyUpdate(
    input: InventoryMutationInput,
    responseJson: string,
  ): D1PreparedStatement {
    return this.db
      .prepare(
        `UPDATE idempotency_records SET response_json = ?
         WHERE account_id = ? AND action = ? AND idempotency_key = ? AND response_json = ?`,
      )
      .bind(responseJson, input.accountId, input.action, input.idempotencyKey, PENDING_RESPONSE);
  }

  private mutationGuard(): D1PreparedStatement {
    return this.db.prepare(
      `SELECT CASE WHEN changes() = 1 THEN 1 ELSE json('inventory_mutation_conflict') END AS mutation_guard`,
    );
  }

  private async releaseInventoryIdempotency(input: InventoryMutationInput): Promise<void> {
    await this.db
      .prepare(
        `DELETE FROM idempotency_records
         WHERE account_id = ? AND action = ? AND idempotency_key = ? AND response_json = ?`,
      )
      .bind(input.accountId, input.action, input.idempotencyKey, PENDING_RESPONSE)
      .run();
  }

  private async getInventoryIdempotency(
    input: InventoryMutationInput,
  ): Promise<InventoryIdempotencyRow | null> {
    return this.db
      .prepare(
        `SELECT input_hash, response_json, expires_at FROM idempotency_records
         WHERE account_id = ? AND action = ? AND idempotency_key = ? AND expires_at > ?`,
      )
      .bind(input.accountId, input.action, input.idempotencyKey, input.now)
      .first<InventoryIdempotencyRow>();
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
