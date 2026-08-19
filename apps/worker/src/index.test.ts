import { describe, expect, it } from 'vitest';

import {
  type ExplorationDataRepository,
  type ExplorationMutationInput,
  type ExplorationRunView,
  FEATURE_FLAG_KEYS,
  GuestRepositoryError,
  type AuthenticatedSession,
  type GuestDataRepository,
  type GuestSessionInput,
  type InventoryMutationInput,
  type InventoryView,
  type PlayerView,
  type RateLimitInput,
  type StoredExplorationMutationResult,
  type StoredInventoryMutationResult,
  type StoredMutationResult,
  type UpdatePreferencesInput,
} from '@neverlight/db';

import { createApp } from './index.js';
import type { WorkerBindings } from './types.js';

const env = {
  DB: {} as WorkerBindings['DB'],
  ENVIRONMENT: 'local',
  VERSION: 'test',
} satisfies WorkerBindings;

class MemoryGuestRepository implements GuestDataRepository, ExplorationDataRepository {
  readonly players = new Map<string, PlayerView>();
  readonly sessions = new Map<
    string,
    AuthenticatedSession & { tokenHash: string; revokedAt?: string }
  >();
  readonly idempotency = new Map<string, { inputHash: string; player: PlayerView }>();
  readonly rates = new Map<string, number>();
  readonly routes = new Map<string, ExplorationRunView>();
  readonly routePlayers = new Map<string, string>();
  readonly routeIdempotency = new Map<string, { inputHash: string; run: ExplorationRunView }>();
  readonly inventories = new Map<string, InventoryView>();
  readonly inventoryIdempotency = new Map<
    string,
    { inputHash: string; result: StoredInventoryMutationResult }
  >();

  async authenticateSession(tokenHash: string, now: string): Promise<AuthenticatedSession | null> {
    const session = [...this.sessions.values()].find(
      (candidate) =>
        candidate.tokenHash === tokenHash && !candidate.revokedAt && candidate.expiresAt > now,
    );
    return session ? clone(session) : null;
  }

  async createGuest(input: GuestSessionInput): Promise<void> {
    this.players.set(input.playerId, {
      playerId: input.playerId,
      handle: input.handle,
      version: 1,
      level: 1,
      experience: 0,
      stats: {
        vitality: 10,
        maxVitality: 10,
        focus: 3,
        maxFocus: 3,
        guard: 0,
        speed: 5,
        luck: 0,
      },
      preferences: {
        locale: 'ja-JP',
        theme: 'retro',
        presentation: 'general',
        reducedMotion: false,
        imagesEnabled: true,
      },
      inventoryLocations: [
        { id: 'inventory.default', kind: 'inventory', sortOrder: 0 },
        { id: 'vault.default', kind: 'vault', sortOrder: 1 },
        { id: 'equipment.default', kind: 'equipment', sortOrder: 2 },
      ],
      featureFlags: Object.fromEntries(FEATURE_FLAG_KEYS.map((key) => [key, false])) as Record<
        (typeof FEATURE_FLAG_KEYS)[number],
        false
      >,
    });
    this.inventories.set(input.playerId, {
      capacity: 30,
      codex: [],
      items: [],
      materials: {},
      playerVersion: 1,
    });
    this.sessions.set(input.sessionId, {
      accountId: input.accountId,
      playerId: input.playerId,
      sessionId: input.sessionId,
      csrfTokenHash: input.csrfTokenHash,
      expiresAt: input.expiresAt,
      tokenHash: input.tokenHash,
    });
  }

  async getPlayer(playerId: string): Promise<PlayerView | null> {
    return this.players.has(playerId) ? clone(this.players.get(playerId)!) : null;
  }

  async rotateSession(currentSessionId: string, next: GuestSessionInput): Promise<void> {
    const current = this.sessions.get(currentSessionId);
    if (current) current.revokedAt = next.createdAt;
    this.sessions.set(next.sessionId, {
      accountId: next.accountId,
      playerId: next.playerId,
      sessionId: next.sessionId,
      csrfTokenHash: next.csrfTokenHash,
      expiresAt: next.expiresAt,
      tokenHash: next.tokenHash,
    });
  }

  async revokeSession(sessionId: string, now: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) session.revokedAt = now;
  }

  async resetGuest(accountId: string): Promise<void> {
    const playerIds = [...this.sessions.values()]
      .filter((session) => session.accountId === accountId)
      .map((session) => session.playerId);
    for (const [id, session] of this.sessions) {
      if (session.accountId === accountId) this.sessions.delete(id);
    }
    for (const playerId of playerIds) this.players.delete(playerId);
    for (const playerId of playerIds) this.inventories.delete(playerId);
    for (const [routeRunId, playerId] of this.routePlayers) {
      if (playerIds.includes(playerId)) {
        this.routes.delete(routeRunId);
        this.routePlayers.delete(routeRunId);
      }
    }
  }

  async updatePreferences(input: UpdatePreferencesInput): Promise<StoredMutationResult> {
    const key = `${input.accountId}:${input.action}:${input.idempotencyKey}`;
    const existing = this.idempotency.get(key);
    if (existing) {
      if (existing.inputHash !== input.inputHash) {
        throw new GuestRepositoryError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request.',
        );
      }
      return { player: clone(existing.player), replayed: true };
    }
    const current = this.players.get(input.playerId);
    if (!current) throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'missing');
    const next: PlayerView = {
      ...clone(current),
      version: current.version + 1,
      preferences: { ...current.preferences, ...input.patch },
    };
    this.players.set(input.playerId, next);
    this.idempotency.set(key, { inputHash: input.inputHash, player: clone(next) });
    return { player: clone(next), replayed: false };
  }

  async consumeRateLimit(input: RateLimitInput): Promise<boolean> {
    const key = `${input.bucketKey}:${input.action}:${input.windowStart}`;
    const count = (this.rates.get(key) ?? 0) + 1;
    this.rates.set(key, count);
    return count <= input.limit;
  }

  async getInventory(playerId: string): Promise<InventoryView | null> {
    const inventory = this.inventories.get(playerId);
    return inventory ? clone(inventory) : null;
  }

  async claimLoot(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = this.inventoryReplay(input);
    if (replay) return replay;
    if (!input.item || !input.ledgerEventIds?.length) {
      throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', 'invalid loot');
    }
    const current = this.inventories.get(input.playerId);
    if (!current) throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'missing');
    const next: InventoryView = {
      ...clone(current),
      codex: addMemoryCodex(current, input.item, input.now),
      items: [clone(input.item), ...current.items],
      playerVersion: current.playerVersion + 1,
    };
    const result = { inventory: next, ledgerEventIds: [...input.ledgerEventIds], replayed: false };
    this.inventories.set(input.playerId, clone(next));
    this.inventoryIdempotency.set(inventoryKey(input), {
      inputHash: input.inputHash,
      result: clone(result),
    });
    return result;
  }

  async equipItem(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = this.inventoryReplay(input);
    if (replay) return replay;
    if (!input.itemId || !input.mode || input.expectedVersion === undefined) {
      throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', 'invalid equip');
    }
    const current = this.inventories.get(input.playerId);
    if (!current) throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'missing');
    if (current.playerVersion !== input.expectedVersion)
      throw new GuestRepositoryError('INVENTORY_STATE_CONFLICT', 'stale');
    const selected = current.items.find(
      (item) => item.id === input.itemId && item.status === 'active',
    );
    if (!selected) throw new GuestRepositoryError('ITEM_NOT_FOUND', 'missing item');
    if (input.mode === 'equip' && selected.location === 'equipment')
      throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', 'already equipped');
    if (input.mode === 'unequip' && selected.location !== 'equipment')
      throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', 'not equipped');
    const replaced =
      input.mode === 'equip'
        ? current.items.find(
            (item) => item.location === 'equipment' && item.equipmentSlot === selected.slot,
          )
        : undefined;
    const next: InventoryView = {
      ...clone(current),
      items: current.items.map((item) => {
        if (replaced && item.id === replaced.id)
          return {
            ...item,
            bindState: 'account-bound',
            equipmentSlot: null,
            location: 'inventory',
          };
        if (item.id !== selected.id) return item;
        return input.mode === 'equip'
          ? { ...item, bindState: 'account-bound', equipmentSlot: item.slot, location: 'equipment' }
          : { ...item, equipmentSlot: null, location: 'inventory' };
      }),
      playerVersion: current.playerVersion + 1,
    };
    return this.storeInventoryMutation(input, next);
  }

  async markItem(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = this.inventoryReplay(input);
    if (replay) return replay;
    if (
      !input.itemId ||
      input.expectedVersion === undefined ||
      input.locked === undefined ||
      input.favorite === undefined
    )
      throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', 'invalid mark');
    const current = this.inventories.get(input.playerId);
    if (!current) throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'missing');
    if (current.playerVersion !== input.expectedVersion)
      throw new GuestRepositoryError('INVENTORY_STATE_CONFLICT', 'stale');
    if (!current.items.some((item) => item.id === input.itemId && item.status === 'active'))
      throw new GuestRepositoryError('ITEM_NOT_FOUND', 'missing item');
    const next: InventoryView = {
      ...clone(current),
      items: current.items.map((item) =>
        item.id === input.itemId
          ? { ...item, favorite: input.favorite!, locked: input.locked! }
          : item,
      ),
      playerVersion: current.playerVersion + 1,
    };
    return this.storeInventoryMutation(input, next);
  }

  async salvageItems(input: InventoryMutationInput): Promise<StoredInventoryMutationResult> {
    const replay = this.inventoryReplay(input);
    if (replay) return replay;
    if (
      !input.itemIds?.length ||
      input.expectedVersion === undefined ||
      input.confirm === undefined ||
      input.unlock === undefined ||
      !input.ledgerEventIds
    )
      throw new GuestRepositoryError('INVALID_INVENTORY_REQUEST', 'invalid salvage');
    const current = this.inventories.get(input.playerId);
    if (!current) throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'missing');
    if (current.playerVersion !== input.expectedVersion)
      throw new GuestRepositoryError('INVENTORY_STATE_CONFLICT', 'stale');
    const selected = input.itemIds.map((id) => {
      const item = current.items.find(
        (candidate) => candidate.id === id && candidate.status === 'active',
      );
      if (!item) throw new GuestRepositoryError('ITEM_NOT_FOUND', 'missing item');
      if (item.location === 'equipment')
        throw new GuestRepositoryError('ITEM_EQUIPPED', 'equipped');
      if (['rare', 'unique', 'relic'].includes(item.rarity) && !input.confirm)
        throw new GuestRepositoryError('CONFIRMATION_REQUIRED', 'confirm');
      if ((item.locked || item.favorite) && !input.unlock)
        throw new GuestRepositoryError('ITEM_PROTECTED', 'protected');
      return item;
    });
    const scrap = selected.reduce(
      (total, item) =>
        total +
        ({ common: 1, uncommon: 2, rare: 4, unique: 7, relic: 10 }[item.rarity] ?? 1) +
        item.affixes.length,
      0,
    );
    const next: InventoryView = {
      ...clone(current),
      items: current.items.map((item) =>
        selected.some((candidate) => candidate.id === item.id)
          ? {
              ...item,
              equipmentSlot: null,
              favorite: false,
              locked: false,
              location: 'inventory',
              status: 'salvaged',
            }
          : item,
      ),
      materials: {
        ...current.materials,
        'material.scrap': (current.materials['material.scrap'] ?? 0) + scrap,
      },
      playerVersion: current.playerVersion + 1,
    };
    return this.storeInventoryMutation(input, next);
  }

  private inventoryReplay(input: InventoryMutationInput): StoredInventoryMutationResult | null {
    const existing = this.inventoryIdempotency.get(inventoryKey(input));
    if (!existing) return null;
    if (existing.inputHash !== input.inputHash)
      throw new GuestRepositoryError('IDEMPOTENCY_KEY_REUSED', 'different input');
    return { ...clone(existing.result), replayed: true };
  }

  private storeInventoryMutation(
    input: InventoryMutationInput,
    inventory: InventoryView,
  ): StoredInventoryMutationResult {
    const result = {
      inventory,
      ledgerEventIds: [...(input.ledgerEventIds ?? [])],
      replayed: false,
    };
    this.inventories.set(input.playerId, clone(inventory));
    this.inventoryIdempotency.set(inventoryKey(input), {
      inputHash: input.inputHash,
      result: clone(result),
    });
    return result;
  }

  async getCurrentRoute(playerId: string, now: string): Promise<ExplorationRunView | null> {
    const matches = [...this.routes.entries()]
      .filter(([routeRunId]) => this.routePlayers.get(routeRunId) === playerId)
      .map(([, route]) => route);
    const current = matches.at(-1);
    if (!current) return null;
    const result = clone(current);
    if (result.phase !== 'complete' && result.expiresAt <= now) result.phase = 'expired';
    return result;
  }

  async startRoute(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = this.routeReplay(input);
    if (replay) return replay;
    if (
      input.routeId === undefined ||
      input.routeVersion === undefined ||
      input.routeSeed === undefined ||
      input.routeSeedHash === undefined
    ) {
      throw new GuestRepositoryError('INVALID_ROUTE', 'invalid route');
    }
    const run: ExplorationRunView = {
      routeRunId: input.routeRunId,
      routeId: input.routeId,
      routeVersion: input.routeVersion,
      phase: 'exploration',
      version: 1,
      nodeId: 'start',
      expiresAt: input.expiresAt,
      serverSeed: input.routeSeed,
      serverSeedHash: input.routeSeedHash,
      encounter: null,
    };
    this.routes.set(run.routeRunId, clone(run));
    this.routePlayers.set(run.routeRunId, input.playerId);
    this.routeIdempotency.set(routeKey(input), { inputHash: input.inputHash, run: clone(run) });
    return { run, replayed: false };
  }

  async chooseNode(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = this.routeReplay(input);
    if (replay) return replay;
    const current = this.routes.get(input.routeRunId);
    if (!current) throw new GuestRepositoryError('ROUTE_NOT_FOUND', 'missing route');
    assertMemoryRoute(current, input.expectedVersion, 'exploration');
    if (
      input.encounterId === undefined ||
      input.encounterVersion === undefined ||
      input.pattern === undefined ||
      input.encounterSeed === undefined ||
      input.encounterSeedHash === undefined ||
      input.combatState === undefined
    ) {
      throw new GuestRepositoryError('INVALID_ROUTE', 'invalid encounter');
    }
    const run: ExplorationRunView = {
      ...clone(current),
      phase: 'encounter',
      version: current.version + 1,
      nodeId: 'encounter',
      serverSeed: input.encounterSeed,
      serverSeedHash: input.encounterSeedHash,
      encounter: {
        encounterId: input.encounterId,
        encounterVersion: input.encounterVersion,
        pattern: input.pattern,
        status: 'active',
        combatState: clone(input.combatState),
        lastResolution: null,
      },
    };
    this.routes.set(run.routeRunId, clone(run));
    this.routePlayers.set(run.routeRunId, input.playerId);
    this.routeIdempotency.set(routeKey(input), { inputHash: input.inputHash, run: clone(run) });
    return { run, replayed: false };
  }

  async resolveCombat(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = this.routeReplay(input);
    if (replay) return replay;
    const current = this.routes.get(input.routeRunId);
    if (!current || !current.encounter)
      throw new GuestRepositoryError('ROUTE_NOT_FOUND', 'missing route');
    assertMemoryRoute(current, input.expectedVersion, 'encounter');
    if (
      input.encounterId !== current.encounter.encounterId ||
      input.combatState === undefined ||
      input.resolution === undefined ||
      input.phase === undefined
    ) {
      throw new GuestRepositoryError('INVALID_COMBAT_STATE', 'invalid combat');
    }
    const run: ExplorationRunView = {
      ...clone(current),
      phase: input.phase,
      version: current.version + 1,
      nodeId: input.phase === 'result' ? 'result' : 'encounter',
      encounter: {
        ...clone(current.encounter),
        status: input.phase === 'result' ? 'resolved' : 'active',
        combatState: clone(input.combatState),
        lastResolution: clone(input.resolution),
      },
    };
    this.routes.set(run.routeRunId, clone(run));
    this.routePlayers.set(run.routeRunId, input.playerId);
    this.routeIdempotency.set(routeKey(input), { inputHash: input.inputHash, run: clone(run) });
    return { run, replayed: false };
  }

  async exitRoute(input: ExplorationMutationInput): Promise<StoredExplorationMutationResult> {
    const replay = this.routeReplay(input);
    if (replay) return replay;
    const current = this.routes.get(input.routeRunId);
    if (!current) throw new GuestRepositoryError('ROUTE_NOT_FOUND', 'missing route');
    assertMemoryRoute(current, input.expectedVersion, 'exit');
    if (current.phase !== 'exploration' && current.phase !== 'result') {
      throw new GuestRepositoryError('INVALID_ROUTE', 'invalid exit');
    }
    const run: ExplorationRunView = {
      ...clone(current),
      phase: 'complete',
      version: current.version + 1,
      nodeId: 'exit',
    };
    this.routes.set(run.routeRunId, clone(run));
    this.routePlayers.set(run.routeRunId, input.playerId);
    this.routeIdempotency.set(routeKey(input), { inputHash: input.inputHash, run: clone(run) });
    return { run, replayed: false };
  }

  private routeReplay(input: ExplorationMutationInput): StoredExplorationMutationResult | null {
    const existing = this.routeIdempotency.get(routeKey(input));
    if (!existing) return null;
    if (existing.inputHash !== input.inputHash) {
      throw new GuestRepositoryError('IDEMPOTENCY_KEY_REUSED', 'different input');
    }
    return { run: clone(existing.run), replayed: true };
  }
}

function routeKey(input: ExplorationMutationInput): string {
  return `${input.accountId}:${input.action}:${input.idempotencyKey}`;
}

function inventoryKey(input: InventoryMutationInput): string {
  return `${input.accountId}:${input.action}:${input.idempotencyKey}`;
}

function addMemoryCodex(
  current: InventoryView,
  item: NonNullable<InventoryMutationInput['item']>,
  now: string,
): InventoryView['codex'] {
  const entries = [
    { entryId: item.baseId, entryType: 'item' as const },
    ...item.affixes.map((affix) => ({ entryId: affix.id, entryType: 'affix' as const })),
  ];
  const codex = clone(current.codex);
  for (const entry of entries) {
    const existing = codex.find(
      (candidate) => candidate.entryId === entry.entryId && candidate.entryType === entry.entryType,
    );
    if (existing) existing.discoveryCount += 1;
    else codex.push({ ...entry, discoveryCount: 1, firstSeenAt: now });
  }
  return codex;
}

function assertMemoryRoute(
  route: ExplorationRunView,
  expectedVersion: number | undefined,
  phase: 'exploration' | 'encounter' | 'exit',
): void {
  if (route.phase === 'expired') throw new GuestRepositoryError('ROUTE_EXPIRED', 'expired');
  if (route.phase === 'complete') throw new GuestRepositoryError('INVALID_ROUTE', 'complete');
  if (expectedVersion !== route.version)
    throw new GuestRepositoryError('ROUTE_STATE_CONFLICT', 'stale');
  if (phase !== 'exit' && route.phase !== phase)
    throw new GuestRepositoryError('INVALID_ROUTE', 'wrong phase');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getCookie(response: Response, name: string): string {
  const value = response.headers.get('set-cookie') ?? '';
  const match = value.match(new RegExp(`${name}=([^;,]+)`));
  if (!match) throw new Error(`Missing ${name} cookie`);
  return `${name}=${match[1]}`;
}

function cookieValue(cookie: string): string {
  return cookie.slice(cookie.indexOf('=') + 1);
}

function cookieHeader(session: string, csrf: string): string {
  return `${session}; ${csrf}`;
}

describe('GET /api/health', () => {
  it('returns a typed local health payload', async () => {
    const app = createApp(() => new MemoryGuestRepository());
    const response = await app.request('/api/health', undefined, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      environment: 'local',
      ok: true,
      service: 'project-neverlight-worker',
      version: 'test',
    });
  });
});

describe('guest identity and player preferences', () => {
  it('creates a guest, protects mutations, and makes preference retries idempotent', async () => {
    const repository = new MemoryGuestRepository();
    const app = createApp(() => repository);
    const started = await app.request('/api/v1/guest/start', { method: 'POST' }, env);
    expect(started.status).toBe(201);
    expect(started.headers.get('set-cookie')).toContain('HttpOnly');
    expect(started.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(started.headers.get('set-cookie')).not.toContain('Secure');

    const sessionCookie = getCookie(started, 'neverlight_session');
    const csrfCookie = getCookie(started, 'neverlight_csrf');
    const startedBody = (await started.json()) as { csrfToken: string; player: PlayerView };
    expect(startedBody.csrfToken).toBe(cookieValue(csrfCookie));
    expect(startedBody.player.version).toBe(1);
    expect(startedBody.player.featureFlags.market).toBe(false);

    const noCsrf = await app.request(
      '/api/v1/player/preferences',
      {
        method: 'PUT',
        headers: { Cookie: cookieHeader(sessionCookie, csrfCookie), 'Idempotency-Key': 'prefs-1' },
        body: JSON.stringify({ theme: 'modern' }),
      },
      env,
    );
    expect(noCsrf.status).toBe(403);

    const preferences = { theme: 'modern' };
    const updated = await app.request(
      '/api/v1/player/preferences',
      {
        method: 'PUT',
        headers: {
          Cookie: cookieHeader(sessionCookie, csrfCookie),
          'Content-Type': 'application/json',
          'X-CSRF-Token': cookieValue(csrfCookie),
          'Idempotency-Key': 'prefs-1',
        },
        body: JSON.stringify(preferences),
      },
      env,
    );
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({
      replayed: false,
      player: { version: 2, preferences },
    });

    const replayed = await app.request(
      '/api/v1/player/preferences',
      {
        method: 'PUT',
        headers: {
          Cookie: cookieHeader(sessionCookie, csrfCookie),
          'Content-Type': 'application/json',
          'X-CSRF-Token': cookieValue(csrfCookie),
          'Idempotency-Key': 'prefs-1',
        },
        body: JSON.stringify(preferences),
      },
      env,
    );
    expect(replayed.status).toBe(200);
    expect(replayed.headers.get('Idempotency-Replayed')).toBe('true');
    await expect(replayed.json()).resolves.toMatchObject({
      replayed: true,
      player: { version: 2, preferences },
    });

    const conflictingRetry = await app.request(
      '/api/v1/player/preferences',
      {
        method: 'PUT',
        headers: {
          Cookie: cookieHeader(sessionCookie, csrfCookie),
          'Content-Type': 'application/json',
          'X-CSRF-Token': cookieValue(csrfCookie),
          'Idempotency-Key': 'prefs-1',
        },
        body: JSON.stringify({ theme: 'retro' }),
      },
      env,
    );
    expect(conflictingRetry.status).toBe(409);

    const forged = await app.request(
      '/api/v1/player/preferences',
      {
        method: 'PUT',
        headers: {
          Cookie: cookieHeader(sessionCookie, csrfCookie),
          'Content-Type': 'application/json',
          'X-CSRF-Token': cookieValue(csrfCookie),
          'Idempotency-Key': 'forged-1',
        },
        body: JSON.stringify({
          playerId: 'attacker',
          balances: { crowns: 999999 },
          featureFlags: { market: true },
        }),
      },
      env,
    );
    expect(forged.status).toBe(400);

    const rotated = await app.request(
      '/api/v1/guest/start',
      {
        method: 'POST',
        headers: { Cookie: cookieHeader(sessionCookie, csrfCookie) },
      },
      env,
    );
    expect(rotated.status).toBe(200);
    const rotatedSession = getCookie(rotated, 'neverlight_session');
    const rotatedCsrf = getCookie(rotated, 'neverlight_csrf');
    expect(cookieValue(rotatedSession)).not.toBe(cookieValue(sessionCookie));
    const oldSession = await app.request(
      '/api/v1/session',
      {
        headers: { Cookie: cookieHeader(sessionCookie, csrfCookie) },
      },
      env,
    );
    expect(oldSession.status).toBe(401);
    const currentSession = await app.request(
      '/api/v1/session',
      {
        headers: { Cookie: cookieHeader(rotatedSession, rotatedCsrf) },
      },
      env,
    );
    expect(currentSession.status).toBe(200);

    const logout = await app.request(
      '/api/v1/session/logout',
      {
        method: 'POST',
        headers: {
          Cookie: cookieHeader(rotatedSession, rotatedCsrf),
          'X-CSRF-Token': cookieValue(rotatedCsrf),
        },
      },
      env,
    );
    expect(logout.status).toBe(200);
    const afterLogout = await app.request(
      '/api/v1/session',
      {
        headers: { Cookie: cookieHeader(rotatedSession, rotatedCsrf) },
      },
      env,
    );
    expect(afterLogout.status).toBe(401);
  });

  it('uses secure production cookies and deletes guest data through the reset path', async () => {
    const repository = new MemoryGuestRepository();
    const app = createApp(() => repository);
    const productionEnv = { ...env, ENVIRONMENT: 'production' };
    const started = await app.request('/api/v1/guest/start', { method: 'POST' }, productionEnv);
    expect(started.headers.get('set-cookie')).toContain('Secure');
    const sessionCookie = getCookie(started, 'neverlight_session');
    const csrfCookie = getCookie(started, 'neverlight_csrf');

    const reset = await app.request(
      '/api/v1/guest/reset',
      {
        method: 'POST',
        headers: {
          Cookie: cookieHeader(sessionCookie, csrfCookie),
          'X-CSRF-Token': cookieValue(csrfCookie),
          'Idempotency-Key': 'reset-1',
        },
      },
      productionEnv,
    );
    expect(reset.status).toBe(200);
    await expect(reset.json()).resolves.toEqual({ deleted: true });
    expect(repository.players.size).toBe(0);
    const afterReset = await app.request(
      '/api/v1/player',
      {
        headers: { Cookie: cookieHeader(sessionCookie, csrfCookie) },
      },
      productionEnv,
    );
    expect(afterReset.status).toBe(401);
  });

  it('rate-limits anonymous guest starts', async () => {
    const repository = new MemoryGuestRepository();
    const app = createApp(() => repository);
    const responses = await Promise.all(
      Array.from({ length: 11 }, () =>
        app.request(
          '/api/v1/guest/start',
          {
            method: 'POST',
            headers: { 'CF-Connecting-IP': '198.51.100.24' },
          },
          env,
        ),
      ),
    );
    expect(responses.filter((response) => response.status === 201)).toHaveLength(10);
    expect(responses.at(-1)?.status).toBe(429);
  });
});

describe('exploration-to-combat vertical slice', () => {
  it('persists route versions, rejects forged authority, and replays combat results', async () => {
    const repository = new MemoryGuestRepository();
    const app = createApp(() => repository);
    const started = await app.request('/api/v1/guest/start', { method: 'POST' }, env);
    const sessionCookie = getCookie(started, 'neverlight_session');
    const csrfCookie = getCookie(started, 'neverlight_csrf');
    const headers = {
      Cookie: cookieHeader(sessionCookie, csrfCookie),
      'Content-Type': 'application/json',
      'X-CSRF-Token': cookieValue(csrfCookie),
    };

    const routeStart = await app.request(
      '/api/v1/routes/glass-marsh/start',
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'route-start-1' },
        body: '{}',
      },
      env,
    );
    expect(routeStart.status).toBe(201);
    const routeStartBody = (await routeStart.json()) as {
      route: ExplorationRunView;
    };
    expect(routeStartBody.route.phase).toBe('exploration');
    expect(routeStartBody.route.serverSeed).toBeUndefined();
    expect(routeStartBody.route.serverSeedHash).toMatch(/^([a-f0-9]{64})$/);

    const forged = await app.request(
      '/api/v1/routes/current/choose',
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'route-forged-1' },
        body: JSON.stringify({
          expectedVersion: 1,
          nodeId: 'encounter',
          result: { outcome: 'victory' },
          seed: 1,
        }),
      },
      env,
    );
    expect(forged.status).toBe(400);

    const chosen = await app.request(
      '/api/v1/routes/current/choose',
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'route-choose-1' },
        body: JSON.stringify({ expectedVersion: 1, nodeId: 'encounter' }),
      },
      env,
    );
    expect(chosen.status).toBe(200);
    const chosenBody = (await chosen.json()) as { route: ExplorationRunView };
    expect(chosenBody.route.phase).toBe('encounter');
    expect(chosenBody.route.encounter?.status).toBe('active');

    const stale = await app.request(
      '/api/v1/routes/current/choose',
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'route-choose-stale' },
        body: JSON.stringify({ expectedVersion: 1, nodeId: 'encounter' }),
      },
      env,
    );
    expect(stale.status).toBe(409);

    const targetId = chosenBody.route.encounter?.combatState as {
      enemies: Array<{ id: string }>;
    };
    const combatBody = {
      commands: [
        { targetId: targetId.enemies[0]?.id, type: 'strike' },
        { targetId: targetId.enemies[0]?.id, type: 'strike' },
        { targetId: targetId.enemies[0]?.id, type: 'strike' },
      ],
      expectedVersion: 2,
    };
    const resolved = await app.request(
      '/api/v1/routes/current/combat',
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'combat-1' },
        body: JSON.stringify(combatBody),
      },
      env,
    );
    expect(resolved.status).toBe(200);
    const resolvedBody = (await resolved.json()) as {
      replayed: boolean;
      resolution: { resolutionHash: string };
      route: ExplorationRunView;
    };
    expect(resolvedBody.replayed).toBe(false);
    expect(resolvedBody.route.phase).toBe('result');
    expect(resolvedBody.resolution.resolutionHash).toMatch(/^fnv1a32:/);

    const retried = await app.request(
      '/api/v1/routes/current/combat',
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'combat-1' },
        body: JSON.stringify(combatBody),
      },
      env,
    );
    expect(retried.status).toBe(200);
    expect(retried.headers.get('Idempotency-Replayed')).toBe('true');
    await expect(retried.json()).resolves.toMatchObject({
      replayed: true,
      route: { phase: 'result' },
    });

    const exited = await app.request(
      '/api/v1/routes/current/exit',
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'route-exit-1' },
        body: JSON.stringify({ expectedVersion: 3 }),
      },
      env,
    );
    expect(exited.status).toBe(200);
    await expect(exited.json()).resolves.toMatchObject({ route: { phase: 'complete' } });
  });

  it('blocks all write paths in read-only mode and exposes a safe status', async () => {
    const app = createApp(() => new MemoryGuestRepository());
    const readOnlyEnv = { ...env, READ_ONLY: 'true' };
    const operations = await app.request('/api/v1/operations', undefined, readOnlyEnv);
    await expect(operations.json()).resolves.toMatchObject({
      message: '現在は読み取り専用です。現在地の確認と退出案内だけ利用できます。',
      mode: 'read-only',
      reason: 'forced:read-only',
      writable: false,
    });
    const blocked = await app.request('/api/v1/guest/start', { method: 'POST' }, readOnlyEnv);
    expect(blocked.status).toBe(503);
    await expect(blocked.json()).resolves.toMatchObject({ error: { code: 'READ_ONLY' } });
  });

  it('enters degraded then read-only mode at artificial budget thresholds', async () => {
    const app = createApp(() => new MemoryGuestRepository());
    const budgetEnv = {
      ...env,
      BUDGET_WINDOW_SECONDS: '3600',
      BUDGET_REQUEST_LIMIT: '10',
      BUDGET_WRITE_LIMIT: '10',
      BUDGET_DEGRADED_REQUESTS: '2',
      BUDGET_READ_ONLY_REQUESTS: '4',
      BUDGET_DEGRADED_WRITES: '8',
      BUDGET_READ_ONLY_WRITES: '9',
    };
    await app.request('/api/v1/player', undefined, budgetEnv);
    await app.request('/api/v1/player', undefined, budgetEnv);
    const degraded = await app.request('/api/v1/operations', undefined, budgetEnv);
    await expect(degraded.json()).resolves.toMatchObject({
      mode: 'degraded',
      reason: 'budget:request-degraded-threshold',
      writable: true,
    });
    await app.request('/api/v1/player', undefined, budgetEnv);
    await app.request('/api/v1/player', undefined, budgetEnv);
    const readOnly = await app.request('/api/v1/operations', undefined, budgetEnv);
    await expect(readOnly.json()).resolves.toMatchObject({
      mode: 'read-only',
      reason: 'budget:request-read-only-threshold',
      writable: false,
    });
    const blocked = await app.request('/api/v1/guest/start', { method: 'POST' }, budgetEnv);
    expect(blocked.status).toBe(503);
    await expect(blocked.json()).resolves.toMatchObject({ error: { code: 'READ_ONLY' } });
  });

  it('keeps maintenance mode limited to diagnostics', async () => {
    const app = createApp(() => new MemoryGuestRepository());
    const maintenanceEnv = { ...env, OPERATION_MODE: 'maintenance' };
    const operations = await app.request('/api/v1/operations', undefined, maintenanceEnv);
    await expect(operations.json()).resolves.toMatchObject({
      mode: 'maintenance',
      writable: false,
    });
    const player = await app.request('/api/v1/player', undefined, maintenanceEnv);
    expect(player.status).toBe(503);
    await expect(player.json()).resolves.toMatchObject({ error: { code: 'MAINTENANCE' } });
  });
});
