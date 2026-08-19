import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import {
  createD1GuestRepository,
  GuestRepositoryError,
  type AuthenticatedSession,
  type GuestDataRepository,
  type GuestSessionInput,
  type PlayerPreferences,
} from '@neverlight/db';

import {
  clearCookie,
  createOpaqueId,
  createOpaqueToken,
  CSRF_COOKIE_NAME,
  cookieIsSecure,
  futureIso,
  IDEMPOTENCY_TTL_SECONDS,
  nowIso,
  parseCookies,
  privacyBucketKey,
  requestId,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  serializeCookie,
  sha256Hex,
  stableJson,
} from './security.js';
import type { HealthResponse, WorkerBindings, WorkerRepositoryFactory } from './types.js';

type WorkerEnvironment = {
  Bindings: WorkerBindings;
  Variables: {
    requestId: string;
  };
};

type WorkerContext = Context<WorkerEnvironment>;

type PreferencePatch = Partial<PlayerPreferences>;

const PREFERENCE_ACTION = 'player.preferences.update';

const defaultRepositoryFactory: WorkerRepositoryFactory = (env) => createD1GuestRepository(env.DB);

export function createApp(repositoryFactory: WorkerRepositoryFactory = defaultRepositoryFactory) {
  const app = new Hono<WorkerEnvironment>();

  app.use('*', async (context, next) => {
    const id = requestId();
    context.set('requestId', id);
    context.header('X-Request-Id', id);
    await next();
  });

  app.onError((error, context) => {
    console.error(
      JSON.stringify({
        requestId: context.get('requestId'),
        action: 'unhandled',
        outcome: 'error',
        error: error instanceof Error ? error.name : 'unknown',
      }),
    );
    return errorResponse(
      context,
      500,
      'INTERNAL_ERROR',
      '一時的なエラーです。時間をおいて再試行してください。',
    );
  });

  app.get('/api/health', (context) => {
    const response: HealthResponse = {
      ok: true,
      service: 'project-neverlight-worker',
      environment: context.env.ENVIRONMENT ?? 'local',
      version: context.env.VERSION ?? 'development',
    };

    return context.json(response);
  });

  app.post('/api/v1/guest/start', async (context) => {
    const repository = repositoryFactory(context.env);
    const cookies = parseCookies(context.req.header('Cookie'));
    const existing = await authenticateSession(repository, cookies[SESSION_COOKIE_NAME]);
    const identity = existing?.accountId ?? cookies[SESSION_COOKIE_NAME] ?? clientIdentity(context);
    if (!(await allowRate(repository, 'guest.start', identity, 10, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '開始操作が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }

    const now = nowIso();
    const next = await createSessionInput({
      accountId: existing?.accountId ?? createOpaqueId('acct'),
      playerId: existing?.playerId ?? createOpaqueId('player'),
      handle: existing ? '' : `guest-${createOpaqueId('handle').slice(-12)}`,
      now,
    });

    if (existing) {
      await repository.rotateSession(existing.sessionId, next);
    } else {
      await repository.createGuest(next);
    }

    const player = await repository.getPlayer(next.playerId);
    if (!player) {
      return errorResponse(context, 500, 'PLAYER_NOT_FOUND', 'ゲスト状態を作成できませんでした。');
    }

    setSessionCookies(context, next, context.env.ENVIRONMENT);
    logEvent(context, 'guest.start', existing ? 'rotated' : 'created');
    return context.json(
      {
        session: { type: 'guest', expiresAt: next.expiresAt },
        player,
        csrfToken: next.csrfToken,
      },
      existing ? 200 : 201,
    );
  });

  app.get('/api/v1/session', async (context) => {
    const repository = repositoryFactory(context.env);
    const session = await requireSession(context, repository);
    if (!session)
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'ゲストセッションがありません。');

    return context.json({
      authenticated: true,
      playerId: session.playerId,
      expiresAt: session.expiresAt,
      csrfRequired: true,
    });
  });

  app.get('/api/v1/player', async (context) => {
    const repository = repositoryFactory(context.env);
    const session = await requireSession(context, repository);
    if (!session)
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'ゲストセッションがありません。');

    const player = await repository.getPlayer(session.playerId);
    if (!player)
      return errorResponse(context, 404, 'PLAYER_NOT_FOUND', 'プレイヤーが見つかりません。');
    return context.json({ player });
  });

  app.put('/api/v1/player/preferences', async (context) => {
    const repository = repositoryFactory(context.env);
    const session = await requireSession(context, repository);
    if (!session)
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'ゲストセッションがありません。');
    if (!(await hasCsrf(context, session))) {
      return errorResponse(
        context,
        403,
        'CSRF_INVALID',
        '安全確認に失敗しました。ページを更新してください。',
      );
    }

    const idempotencyKey = context.req.header('Idempotency-Key');
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return errorResponse(
        context,
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key が必要です。',
      );
    }

    if (!(await allowRate(repository, PREFERENCE_ACTION, session.accountId, 30, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '設定変更が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }

    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parsePreferencePatch(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);

    const now = nowIso();
    try {
      const result = await repository.updatePreferences({
        accountId: session.accountId,
        playerId: session.playerId,
        action: PREFERENCE_ACTION,
        idempotencyKey,
        inputHash: await sha256Hex(stableJson(parsed.patch)),
        patch: parsed.patch,
        now,
        expiresAt: futureIso(IDEMPOTENCY_TTL_SECONDS),
      });
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      logEvent(context, PREFERENCE_ACTION, result.replayed ? 'replayed' : 'updated');
      return context.json({ player: result.player, replayed: result.replayed });
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.post('/api/v1/session/logout', async (context) => {
    const repository = repositoryFactory(context.env);
    const session = await requireSession(context, repository);
    if (!session)
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'ゲストセッションがありません。');
    if (!(await hasCsrf(context, session))) {
      return errorResponse(
        context,
        403,
        'CSRF_INVALID',
        '安全確認に失敗しました。ページを更新してください。',
      );
    }

    await repository.revokeSession(session.sessionId, nowIso());
    clearSessionCookies(context, context.env.ENVIRONMENT);
    logEvent(context, 'session.logout', 'revoked');
    return context.json({ loggedOut: true });
  });

  app.post('/api/v1/guest/reset', async (context) => {
    const repository = repositoryFactory(context.env);
    const session = await requireSession(context, repository);
    if (!session)
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'ゲストセッションがありません。');
    if (!(await hasCsrf(context, session))) {
      return errorResponse(
        context,
        403,
        'CSRF_INVALID',
        '安全確認に失敗しました。ページを更新してください。',
      );
    }
    const idempotencyKey = context.req.header('Idempotency-Key');
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return errorResponse(
        context,
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key が必要です。',
      );
    }
    if (!(await allowRate(repository, 'guest.reset', session.accountId, 5, 3600))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        'リセット操作が多すぎます。時間をおいてください。',
        {
          'Retry-After': '3600',
        },
      );
    }

    await repository.resetGuest(session.accountId);
    clearSessionCookies(context, context.env.ENVIRONMENT);
    logEvent(context, 'guest.reset', 'deleted');
    return context.json({ deleted: true });
  });

  return app;
}

const app = createApp();

export default app;

async function createSessionInput(input: {
  accountId: string;
  playerId: string;
  handle: string;
  now: string;
}): Promise<GuestSessionInput & { token: string; csrfToken: string }> {
  const token = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  return {
    accountId: input.accountId,
    playerId: input.playerId,
    sessionId: createOpaqueId('session'),
    handle: input.handle,
    tokenHash: await sha256Hex(token),
    csrfTokenHash: await sha256Hex(csrfToken),
    csrfToken,
    createdAt: input.now,
    expiresAt: new Date(Date.parse(input.now) + SESSION_TTL_SECONDS * 1000).toISOString(),
    token,
  };
}

async function authenticateSession(
  repository: GuestDataRepository,
  token: string | undefined,
): Promise<AuthenticatedSession | null> {
  if (!token || token.length < 40) return null;
  return repository.authenticateSession(await sha256Hex(token), nowIso());
}

async function requireSession(
  context: WorkerContext,
  repository: GuestDataRepository,
): Promise<AuthenticatedSession | null> {
  const cookies = parseCookies(context.req.header('Cookie'));
  return authenticateSession(repository, cookies[SESSION_COOKIE_NAME]);
}

async function hasCsrf(context: WorkerContext, session: AuthenticatedSession): Promise<boolean> {
  const header = context.req.header('X-CSRF-Token');
  const cookie = parseCookies(context.req.header('Cookie'))[CSRF_COOKIE_NAME];
  if (!header || !cookie || header !== cookie || header.length < 32 || header.length > 256)
    return false;
  return (await sha256Hex(header)) === session.csrfTokenHash;
}

async function allowRate(
  repository: GuestDataRepository,
  action: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = new Date();
  const seconds = Math.floor(now.getTime() / 1000);
  return repository.consumeRateLimit({
    bucketKey: await privacyBucketKey(action, identity),
    action,
    windowStart: Math.floor(seconds / windowSeconds) * windowSeconds,
    limit,
    now: now.toISOString(),
  });
}

function clientIdentity(context: WorkerContext): string {
  return context.req.header('CF-Connecting-IP') ?? 'anonymous';
}

function setSessionCookies(
  context: WorkerContext,
  session: GuestSessionInput & { token: string; csrfToken: string },
  environment: string | undefined,
): void {
  const secure = cookieIsSecure(environment);
  context.header(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      secure,
    }),
    { append: true },
  );
  context.header(
    'Set-Cookie',
    serializeCookie(CSRF_COOKIE_NAME, session.csrfToken, {
      httpOnly: false,
      maxAge: SESSION_TTL_SECONDS,
      secure,
    }),
    { append: true },
  );
  context.header('Cache-Control', 'no-store');
}

function clearSessionCookies(context: WorkerContext, environment: string | undefined): void {
  const secure = cookieIsSecure(environment);
  context.header('Set-Cookie', clearCookie(SESSION_COOKIE_NAME, secure, true), { append: true });
  context.header('Set-Cookie', clearCookie(CSRF_COOKIE_NAME, secure, false), { append: true });
  context.header('Cache-Control', 'no-store');
}

function isValidIdempotencyKey(value: string | undefined): value is string {
  return Boolean(value && value.length <= 128 && /^[A-Za-z0-9._~-]+$/.test(value));
}

async function readJson(
  context: WorkerContext,
): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  const contentLength = Number(context.req.header('Content-Length') ?? 0);
  if (contentLength > 8192) return { ok: false, message: 'リクエストが大きすぎます。' };
  try {
    return { ok: true, value: await context.req.json() };
  } catch {
    return { ok: false, message: 'JSONを読み取れません。' };
  }
}

function parsePreferencePatch(value: unknown):
  | { ok: true; patch: PreferencePatch }
  | {
      ok: false;
      status: ContentfulStatusCode;
      code: 'INVALID_PREFERENCES' | 'FEATURE_DISABLED';
      message: string;
    } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_PREFERENCES',
      message: '設定はJSONオブジェクトで指定してください。',
    };
  }

  const input = value as Record<string, unknown>;
  const allowed = new Set(['locale', 'theme', 'presentation', 'reducedMotion', 'imagesEnabled']);
  const keys = Object.keys(input);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_PREFERENCES',
      message: '変更できる設定だけを指定してください。',
    };
  }

  const patch: PreferencePatch = {};
  if ('locale' in input) {
    if (input.locale !== 'ja-JP' && input.locale !== 'en-US') {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_PREFERENCES',
        message: 'locale が不正です。',
      };
    }
    patch.locale = input.locale;
  }
  if ('theme' in input) {
    if (input.theme !== 'retro' && input.theme !== 'modern') {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_PREFERENCES',
        message: 'theme が不正です。',
      };
    }
    patch.theme = input.theme;
  }
  if ('presentation' in input) {
    if (input.presentation !== 'general') {
      return {
        ok: false,
        status: 403,
        code: 'FEATURE_DISABLED',
        message: 'Suggestive presentation は現在無効です。',
      };
    }
    patch.presentation = 'general';
  }
  if ('reducedMotion' in input) {
    if (typeof input.reducedMotion !== 'boolean') {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_PREFERENCES',
        message: 'reducedMotion が不正です。',
      };
    }
    patch.reducedMotion = input.reducedMotion;
  }
  if ('imagesEnabled' in input) {
    if (typeof input.imagesEnabled !== 'boolean') {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_PREFERENCES',
        message: 'imagesEnabled が不正です。',
      };
    }
    patch.imagesEnabled = input.imagesEnabled;
  }
  return { ok: true, patch };
}

function repositoryErrorResponse(context: WorkerContext, error: unknown): Response {
  if (!(error instanceof GuestRepositoryError)) throw error;
  const mapping: Record<GuestRepositoryError['code'], [ContentfulStatusCode, string]> = {
    IDEMPOTENCY_KEY_REUSED: [409, '同じIdempotency-Keyに別の内容は指定できません。'],
    IDEMPOTENCY_IN_PROGRESS: [409, '同じ操作が処理中です。同じキーで再試行してください。'],
    PLAYER_STATE_CONFLICT: [409, 'プレイヤー状態が更新されました。最新状態を取得してください。'],
    PLAYER_NOT_FOUND: [404, 'プレイヤーが見つかりません。'],
  };
  const [status, message] = mapping[error.code];
  return errorResponse(context, status, error.code, message);
}

function errorResponse(
  context: WorkerContext,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  headers?: Record<string, string>,
): Response {
  for (const [name, value] of Object.entries(headers ?? {})) context.header(name, value);
  return context.json(
    {
      error: {
        code,
        message,
        requestId: context.get('requestId'),
      },
    },
    status,
  );
}

function logEvent(context: WorkerContext, action: string, outcome: string): void {
  console.info(
    JSON.stringify({
      requestId: context.get('requestId'),
      action,
      outcome,
    }),
  );
}
