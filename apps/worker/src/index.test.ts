import { describe, expect, it } from 'vitest';

import {
  FEATURE_FLAG_KEYS,
  GuestRepositoryError,
  type AuthenticatedSession,
  type GuestDataRepository,
  type GuestSessionInput,
  type PlayerView,
  type RateLimitInput,
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

class MemoryGuestRepository implements GuestDataRepository {
  readonly players = new Map<string, PlayerView>();
  readonly sessions = new Map<
    string,
    AuthenticatedSession & { tokenHash: string; revokedAt?: string }
  >();
  readonly idempotency = new Map<string, { inputHash: string; player: PlayerView }>();
  readonly rates = new Map<string, number>();

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
