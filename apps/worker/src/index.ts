import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import {
  createD1GuestRepository,
  GuestRepositoryError,
  type ExplorationMutationInput,
  type ExplorationRunView,
  type AuthenticatedSession,
  type GuestDataRepository,
  type GuestSessionInput,
  type InventoryMutationInput,
  type InventoryView,
  type PlayerPreferences,
} from '@neverlight/db';

import {
  COMBAT_RULESET_VERSION,
  CombatInputError,
  createCombatState,
  deriveEquipmentStats,
  LOOT_CONTENT_VERSION,
  LOOT_RULESET_VERSION,
  resolveLootDrop,
  resolveCombat,
  type CombatCommand,
  type CombatResolution,
  type CombatState,
  type EnemyPattern,
} from '@neverlight/game-core';

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
import type {
  HealthResponse,
  WorkerBindings,
  WorkerRepository,
  WorkerRepositoryFactory,
} from './types.js';

type WorkerEnvironment = {
  Bindings: WorkerBindings;
  Variables: {
    requestId: string;
  };
};

type WorkerContext = Context<WorkerEnvironment>;

type PreferencePatch = Partial<PlayerPreferences>;

const PREFERENCE_ACTION = 'player.preferences.update';
const ROUTE_ID = 'rain-tower';
const ROUTE_VERSION = '1.0.0';
const ROUTE_TTL_SECONDS = 60 * 30;
const ROUTE_START_ACTION = 'route.start';
const ROUTE_CHOOSE_ACTION = 'route.choose';
const COMBAT_RESOLVE_ACTION = 'route.combat.resolve';
const ROUTE_EXIT_ACTION = 'route.exit';
const INVENTORY_LOOT_ACTION = 'inventory.loot.claim';
const INVENTORY_EQUIP_ACTION = 'inventory.item.equip';
const INVENTORY_MARK_ACTION = 'inventory.item.mark';
const INVENTORY_SALVAGE_ACTION = 'inventory.items.salvage';

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

  app.get('/api/v1/operations', (context) => {
    const readOnly = isReadOnly(context.env);
    return context.json({
      mode: readOnly ? 'read-only' : 'normal',
      writable: !readOnly,
      message: readOnly
        ? '現在は読み取り専用です。現在地の確認と退出案内だけ利用できます。'
        : '通常運用です。サーバー権威の操作を受け付けます。',
    });
  });

  app.post('/api/v1/routes/rain-tower/start', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const empty = parseEmptyObject(body.value);
    if (!empty.ok) return errorResponse(context, 400, 'INVALID_ROUTE_REQUEST', empty.message);
    if (!(await allowRate(repository, ROUTE_START_ACTION, session.accountId, 10, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '探索開始が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }

    const routeSeed = randomSeed();
    const input: ExplorationMutationInput = {
      accountId: session.accountId,
      playerId: session.playerId,
      action: ROUTE_START_ACTION,
      idempotencyKey,
      inputHash: await sha256Hex(stableJson({ routeId: ROUTE_ID, request: empty.value })),
      now: nowIso(),
      expiresAt: futureIso(ROUTE_TTL_SECONDS),
      routeRunId: createOpaqueId('route'),
      routeId: ROUTE_ID,
      routeVersion: ROUTE_VERSION,
      routeSeed,
      routeSeedHash: await sha256Hex(`route:${routeSeed}`),
    };
    try {
      const result = await repository.startRoute(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      logEvent(context, ROUTE_START_ACTION, result.replayed ? 'replayed' : 'created');
      return context.json(
        { route: publicRoute(result.run), replayed: result.replayed },
        result.replayed ? 200 : 201,
      );
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.get('/api/v1/routes/current', async (context) => {
    const repository = repositoryFactory(context.env);
    const session = await requireSession(context, repository);
    if (!session)
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'ゲストセッションがありません。');
    const route = await repository.getCurrentRoute(session.playerId, nowIso());
    context.header('Cache-Control', 'no-store');
    return context.json({ route: route ? publicRoute(route) : null });
  });

  app.post('/api/v1/routes/current/choose', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parseChooseRequest(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);
    if (!(await allowRate(repository, ROUTE_CHOOSE_ACTION, session.accountId, 30, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '遭遇選択が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }
    const current = await repository.getCurrentRoute(session.playerId, nowIso());
    if (!current)
      return errorResponse(context, 404, 'ROUTE_NOT_FOUND', '探索ルートが見つかりません。');
    const encounterSeed = randomSeed();
    const pattern: EnemyPattern = 'heavy-telegraph';
    const input: ExplorationMutationInput = {
      accountId: session.accountId,
      playerId: session.playerId,
      action: ROUTE_CHOOSE_ACTION,
      idempotencyKey,
      inputHash: await sha256Hex(stableJson(parsed.value)),
      now: nowIso(),
      expiresAt: futureIso(ROUTE_TTL_SECONDS),
      routeRunId: current.routeRunId,
      expectedVersion: parsed.value.expectedVersion,
      nodeId: parsed.value.nodeId,
      encounterId: createOpaqueId('encounter'),
      encounterVersion: '1.0.0',
      pattern,
      encounterSeed,
      encounterSeedHash: await sha256Hex(`encounter:${encounterSeed}`),
      combatState: createFixtureCombatState(pattern),
    };
    try {
      const result = await repository.chooseNode(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      logEvent(context, ROUTE_CHOOSE_ACTION, result.replayed ? 'replayed' : 'encounter_created');
      return context.json({ route: publicRoute(result.run), replayed: result.replayed });
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.post('/api/v1/routes/current/combat', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parseCombatRequest(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);
    if (!(await allowRate(repository, COMBAT_RESOLVE_ACTION, session.accountId, 60, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '戦闘解決が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }
    const current = await repository.getCurrentRoute(session.playerId, nowIso());
    if (!current?.encounter || current.serverSeed === null) {
      return errorResponse(context, 409, 'INVALID_ROUTE', '現在は戦闘入力を受け付けられません。');
    }

    let resolution: CombatResolution;
    try {
      resolution = resolveCombat({
        commands: parsed.value.commands,
        rulesetVersion: COMBAT_RULESET_VERSION,
        seed: current.serverSeed,
        state: current.encounter.combatState as CombatState,
      });
    } catch (error) {
      if (error instanceof CombatInputError) {
        return errorResponse(context, 400, 'INVALID_COMBAT_COMMAND', error.message);
      }
      throw error;
    }

    const now = nowIso();
    const phase = resolution.state.outcome === 'ongoing' ? 'encounter' : 'result';
    const input: ExplorationMutationInput = {
      accountId: session.accountId,
      playerId: session.playerId,
      action: COMBAT_RESOLVE_ACTION,
      idempotencyKey,
      inputHash: await sha256Hex(stableJson(parsed.value)),
      now,
      expiresAt: futureIso(ROUTE_TTL_SECONDS),
      routeRunId: current.routeRunId,
      expectedVersion: parsed.value.expectedVersion,
      encounterId: current.encounter.encounterId,
      combatState: resolution.state,
      resolutionId: createOpaqueId('resolution'),
      resolution,
      rulesetVersion: resolution.rulesetVersion,
      combatSeed: resolution.seed,
      inputStateHash: resolution.inputStateHash,
      outputStateHash: resolution.outputStateHash,
      resolutionHash: resolution.resolutionHash,
      phase,
    };
    try {
      const result = await repository.resolveCombat(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      logEvent(context, COMBAT_RESOLVE_ACTION, result.replayed ? 'replayed' : phase);
      return context.json({
        route: publicRoute(result.run),
        resolution: result.replayed
          ? publicResolutionValue(result.run.encounter?.lastResolution)
          : publicResolution(resolution),
        replayed: result.replayed,
      });
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.post('/api/v1/routes/current/exit', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parseExitRequest(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);
    if (!(await allowRate(repository, ROUTE_EXIT_ACTION, session.accountId, 30, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '退出操作が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }
    const current = await repository.getCurrentRoute(session.playerId, nowIso());
    if (!current)
      return errorResponse(context, 404, 'ROUTE_NOT_FOUND', '探索ルートが見つかりません。');
    const input: ExplorationMutationInput = {
      accountId: session.accountId,
      playerId: session.playerId,
      action: ROUTE_EXIT_ACTION,
      idempotencyKey,
      inputHash: await sha256Hex(stableJson(parsed.value)),
      now: nowIso(),
      expiresAt: futureIso(ROUTE_TTL_SECONDS),
      routeRunId: current.routeRunId,
      expectedVersion: parsed.value.expectedVersion,
    };
    try {
      const result = await repository.exitRoute(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      logEvent(context, ROUTE_EXIT_ACTION, result.replayed ? 'replayed' : 'complete');
      return context.json({ route: publicRoute(result.run), replayed: result.replayed });
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.get('/api/v1/inventory', async (context) => {
    const repository = repositoryFactory(context.env);
    const session = await requireSession(context, repository);
    if (!session)
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'ゲストセッションがありません。');
    const inventory = await repository.getInventory(session.playerId);
    if (!inventory)
      return errorResponse(context, 404, 'PLAYER_NOT_FOUND', 'プレイヤーが見つかりません。');
    context.header('Cache-Control', 'no-store');
    return context.json({
      inventory: await publicInventory(repository, session.playerId, inventory),
    });
  });

  app.post('/api/v1/inventory/loot/claim', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parseLootClaimRequest(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);
    if (!(await allowRate(repository, INVENTORY_LOOT_ACTION, session.accountId, 10, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        'ドロップ取得が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }
    const seed = randomSeed();
    const itemId = createOpaqueId('item');
    const loot =
      parsed.value.sourceRef === 'rain-tower.boss'
        ? resolveLootDrop({
            itemId,
            minimumRarity: 'rare',
            seed,
            sourceRef: parsed.value.sourceRef,
          })
        : resolveLootDrop({ itemId, seed, sourceRef: parsed.value.sourceRef });
    const input: InventoryMutationInput = {
      accountId: session.accountId,
      action: INVENTORY_LOOT_ACTION,
      contentVersion: LOOT_CONTENT_VERSION,
      expiresAt: futureIso(IDEMPOTENCY_TTL_SECONDS),
      idempotencyKey,
      inputHash: await sha256Hex(stableJson(parsed.value)),
      item: loot.item,
      ledgerEventIds: [createOpaqueId('ledger')],
      mintSeed: loot.seed,
      now: nowIso(),
      playerId: session.playerId,
      rulesetVersion: LOOT_RULESET_VERSION,
      sourceRef: parsed.value.sourceRef,
      transactionId: createOpaqueId('txn'),
    };
    try {
      const result = await repository.claimLoot(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      logEvent(context, INVENTORY_LOOT_ACTION, result.replayed ? 'replayed' : 'minted');
      return context.json(
        {
          inventory: await publicInventory(repository, session.playerId, result.inventory),
          ledgerEventIds: result.ledgerEventIds,
          replayed: result.replayed,
        },
        result.replayed ? 200 : 201,
      );
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.post('/api/v1/inventory/equip', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parseInventoryEquipRequest(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);
    if (!(await allowRate(repository, INVENTORY_EQUIP_ACTION, session.accountId, 30, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '装備操作が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }
    const input: InventoryMutationInput = {
      accountId: session.accountId,
      action: INVENTORY_EQUIP_ACTION,
      expectedVersion: parsed.value.expectedVersion,
      expiresAt: futureIso(IDEMPOTENCY_TTL_SECONDS),
      idempotencyKey,
      inputHash: await sha256Hex(stableJson(parsed.value)),
      itemId: parsed.value.itemId,
      mode: parsed.value.mode,
      now: nowIso(),
      playerId: session.playerId,
    };
    try {
      const result = await repository.equipItem(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      return context.json({
        inventory: await publicInventory(repository, session.playerId, result.inventory),
        replayed: result.replayed,
      });
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.post('/api/v1/inventory/mark', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parseInventoryMarkRequest(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);
    if (!(await allowRate(repository, INVENTORY_MARK_ACTION, session.accountId, 60, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '保護設定の変更が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }
    const input: InventoryMutationInput = {
      accountId: session.accountId,
      action: INVENTORY_MARK_ACTION,
      expectedVersion: parsed.value.expectedVersion,
      expiresAt: futureIso(IDEMPOTENCY_TTL_SECONDS),
      favorite: parsed.value.favorite,
      idempotencyKey,
      inputHash: await sha256Hex(stableJson(parsed.value)),
      itemId: parsed.value.itemId,
      locked: parsed.value.locked,
      now: nowIso(),
      playerId: session.playerId,
    };
    try {
      const result = await repository.markItem(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      return context.json({
        inventory: await publicInventory(repository, session.playerId, result.inventory),
        replayed: result.replayed,
      });
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.post('/api/v1/inventory/salvage', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const body = await readJson(context);
    if (!body.ok) return errorResponse(context, 400, 'INVALID_JSON', body.message);
    const parsed = parseInventorySalvageRequest(body.value);
    if (!parsed.ok) return errorResponse(context, parsed.status, parsed.code, parsed.message);
    if (!(await allowRate(repository, INVENTORY_SALVAGE_ACTION, session.accountId, 30, 60))) {
      return errorResponse(
        context,
        429,
        'RATE_LIMITED',
        '分解操作が多すぎます。少し待ってください。',
        {
          'Retry-After': '60',
        },
      );
    }
    const input: InventoryMutationInput = {
      accountId: session.accountId,
      action: INVENTORY_SALVAGE_ACTION,
      confirm: parsed.value.confirm,
      expectedVersion: parsed.value.expectedVersion,
      expiresAt: futureIso(IDEMPOTENCY_TTL_SECONDS),
      idempotencyKey,
      inputHash: await sha256Hex(stableJson(parsed.value)),
      itemIds: parsed.value.itemIds,
      ledgerEventIds: [
        ...parsed.value.itemIds.map(() => createOpaqueId('ledger')),
        createOpaqueId('ledger'),
      ],
      now: nowIso(),
      playerId: session.playerId,
      sourceRef: 'inventory.salvage',
      transactionId: createOpaqueId('txn'),
      unlock: parsed.value.unlock,
    };
    try {
      const result = await repository.salvageItems(input);
      if (result.replayed) context.header('Idempotency-Replayed', 'true');
      context.header('Cache-Control', 'no-store');
      logEvent(context, INVENTORY_SALVAGE_ACTION, result.replayed ? 'replayed' : 'consumed');
      return context.json({
        inventory: await publicInventory(repository, session.playerId, result.inventory),
        ledgerEventIds: result.ledgerEventIds,
        replayed: result.replayed,
      });
    } catch (error) {
      return repositoryErrorResponse(context, error);
    }
  });

  app.post('/api/v1/guest/start', async (context) => {
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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
    const blocked = ensureWritable(context);
    if (blocked) return blocked;
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

function isReadOnly(environment: WorkerBindings): boolean {
  return environment.READ_ONLY === 'true' || environment.READ_ONLY === '1';
}

function ensureWritable(context: WorkerContext): Response | null {
  if (!isReadOnly(context.env)) return null;
  return errorResponse(
    context,
    503,
    'READ_ONLY',
    '現在は読み取り専用です。現在地の確認と退出案内だけ利用できます。',
    { 'Retry-After': '60', 'Cache-Control': 'no-store' },
  );
}

function randomSeed(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] ?? 0;
}

function createFixtureCombatState(pattern: EnemyPattern): CombatState {
  const state = createCombatState(pattern);
  const enemy = state.enemies[0];
  if (enemy) {
    // The vertical-slice fixture is intentionally one short readable encounter; live balance is deferred.
    enemy.maxVitality = 15;
    enemy.vitality = 15;
  }
  return state;
}

function publicRoute(route: ExplorationRunView): Omit<ExplorationRunView, 'serverSeed'> {
  const { serverSeed, ...withoutServerSeed } = route;
  void serverSeed;
  return {
    ...withoutServerSeed,
    encounter: withoutServerSeed.encounter
      ? {
          ...withoutServerSeed.encounter,
          lastResolution: publicResolutionValue(withoutServerSeed.encounter.lastResolution),
        }
      : null,
  };
}

async function publicInventory(
  repository: WorkerRepository,
  playerId: string,
  inventory: InventoryView,
): Promise<InventoryView & { derivedStats: ReturnType<typeof deriveEquipmentStats> }> {
  const player = await repository.getPlayer(playerId);
  if (!player) throw new GuestRepositoryError('PLAYER_NOT_FOUND', 'プレイヤーが見つかりません。');
  const derivedStats = deriveEquipmentStats(
    {
      armor: 0,
      attack: 0,
      focus: player.stats.focus,
      guard: player.stats.guard,
      luck: player.stats.luck,
      maxFocus: player.stats.maxFocus,
      maxVitality: player.stats.maxVitality,
      speed: player.stats.speed,
      vitality: player.stats.vitality,
      ward: 0,
    },
    inventory.items,
  );
  return { ...inventory, derivedStats };
}

function publicResolutionValue(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const candidate = value as Partial<CombatResolution>;
  if (!Array.isArray(candidate.events) || typeof candidate.resolutionHash !== 'string')
    return value;
  return publicResolution(candidate as CombatResolution);
}

function publicResolution(resolution: CombatResolution): Omit<CombatResolution, 'seed'> {
  const { seed, ...withoutSeed } = resolution;
  void seed;
  return {
    ...withoutSeed,
    events: resolution.events.map((event) => ({
      ...event,
      data: Object.fromEntries(Object.entries(event.data).filter(([key]) => key !== 'seed')),
    })),
  };
}

type RequestParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: ContentfulStatusCode; code: string; message: string };

type EmptyRequest = Record<string, never>;
type ExpectedVersionRequest = { expectedVersion: number };
type ChooseRequest = ExpectedVersionRequest & { nodeId: 'encounter' };
type CombatRequest = ExpectedVersionRequest & { commands: CombatCommand[] };
type LootClaimRequest = { sourceRef: 'rain-tower.boss' | 'rain-tower.cache' };
type InventoryEquipRequest = ExpectedVersionRequest & {
  itemId: string;
  mode: 'equip' | 'unequip';
};
type InventoryMarkRequest = ExpectedVersionRequest & {
  favorite: boolean;
  itemId: string;
  locked: boolean;
};
type InventorySalvageRequest = ExpectedVersionRequest & {
  confirm: boolean;
  itemIds: string[];
  unlock: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function parseEmptyObject(value: unknown): RequestParseResult<EmptyRequest> {
  if (!isRecord(value) || Object.keys(value).length !== 0) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_ROUTE_REQUEST',
      message: '空のJSONオブジェクトだけ指定できます。',
    };
  }
  return { ok: true, value: {} };
}

function parseExpectedVersion(value: unknown): number | null {
  if (!Number.isSafeInteger(value) || typeof value !== 'number' || value < 1 || value > 1_000_000) {
    return null;
  }
  return value;
}

function parseChooseRequest(value: unknown): RequestParseResult<ChooseRequest> {
  if (!isRecord(value) || !hasExactKeys(value, ['expectedVersion', 'nodeId'])) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_ROUTE_REQUEST',
      message: 'ルート選択の形式が不正です。',
    };
  }
  const expectedVersion = parseExpectedVersion(value.expectedVersion);
  if (expectedVersion === null || value.nodeId !== 'encounter') {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_ROUTE_REQUEST',
      message: 'ルート選択が不正です。',
    };
  }
  return { ok: true, value: { expectedVersion, nodeId: 'encounter' } };
}

function parseExitRequest(value: unknown): RequestParseResult<ExpectedVersionRequest> {
  if (!isRecord(value) || !hasExactKeys(value, ['expectedVersion'])) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_ROUTE_REQUEST',
      message: '退出要求の形式が不正です。',
    };
  }
  const expectedVersion = parseExpectedVersion(value.expectedVersion);
  if (expectedVersion === null) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_ROUTE_REQUEST',
      message: 'versionが不正です。',
    };
  }
  return { ok: true, value: { expectedVersion } };
}

function parseCombatRequest(value: unknown): RequestParseResult<CombatRequest> {
  if (!isRecord(value) || !hasExactKeys(value, ['commands', 'expectedVersion'])) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_COMBAT_COMMAND',
      message: '戦闘要求の形式が不正です。',
    };
  }
  const expectedVersion = parseExpectedVersion(value.expectedVersion);
  if (
    expectedVersion === null ||
    !Array.isArray(value.commands) ||
    value.commands.length < 1 ||
    value.commands.length > 3
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_COMBAT_COMMAND',
      message: '命令は1〜3件で指定してください。',
    };
  }
  const commands: CombatCommand[] = [];
  for (const command of value.commands) {
    const parsed = parseCombatCommand(command);
    if (!parsed) {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_COMBAT_COMMAND',
        message: '命令の形式が不正です。',
      };
    }
    commands.push(parsed);
  }
  return { ok: true, value: { expectedVersion, commands } };
}

function parseLootClaimRequest(value: unknown): RequestParseResult<LootClaimRequest> {
  if (!isRecord(value) || !hasExactKeys(value, ['sourceRef'])) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: 'ドロップ取得の形式が不正です。',
    };
  }
  if (value.sourceRef !== 'rain-tower.cache' && value.sourceRef !== 'rain-tower.boss') {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: '許可されたドロップ源だけ指定できます。',
    };
  }
  return { ok: true, value: { sourceRef: value.sourceRef } };
}

function parseInventoryEquipRequest(value: unknown): RequestParseResult<InventoryEquipRequest> {
  if (!isRecord(value) || !hasExactKeys(value, ['expectedVersion', 'itemId', 'mode'])) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: '装備操作の形式が不正です。',
    };
  }
  const expectedVersion = parseExpectedVersion(value.expectedVersion);
  if (
    expectedVersion === null ||
    !isSafeClientId(value.itemId) ||
    (value.mode !== 'equip' && value.mode !== 'unequip')
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: '装備操作が不正です。',
    };
  }
  return { ok: true, value: { expectedVersion, itemId: value.itemId, mode: value.mode } };
}

function parseInventoryMarkRequest(value: unknown): RequestParseResult<InventoryMarkRequest> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['expectedVersion', 'favorite', 'itemId', 'locked'])
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: '保護設定の形式が不正です。',
    };
  }
  const expectedVersion = parseExpectedVersion(value.expectedVersion);
  if (
    expectedVersion === null ||
    !isSafeClientId(value.itemId) ||
    typeof value.favorite !== 'boolean' ||
    typeof value.locked !== 'boolean'
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: '保護設定が不正です。',
    };
  }
  return {
    ok: true,
    value: {
      expectedVersion,
      favorite: value.favorite,
      itemId: value.itemId,
      locked: value.locked,
    },
  };
}

function parseInventorySalvageRequest(value: unknown): RequestParseResult<InventorySalvageRequest> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['confirm', 'expectedVersion', 'itemIds', 'unlock'])
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: '分解操作の形式が不正です。',
    };
  }
  const expectedVersion = parseExpectedVersion(value.expectedVersion);
  if (
    expectedVersion === null ||
    !Array.isArray(value.itemIds) ||
    value.itemIds.length < 1 ||
    value.itemIds.length > 20 ||
    value.itemIds.some((itemId) => !isSafeClientId(itemId)) ||
    new Set(value.itemIds).size !== value.itemIds.length ||
    typeof value.confirm !== 'boolean' ||
    typeof value.unlock !== 'boolean'
  ) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_INVENTORY_REQUEST',
      message: '分解対象または確認値が不正です。',
    };
  }
  return {
    ok: true,
    value: {
      confirm: value.confirm,
      expectedVersion,
      itemIds: value.itemIds,
      unlock: value.unlock,
    },
  };
}

function parseCombatCommand(value: unknown): CombatCommand | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'guard' || value.type === 'flee') {
    return hasExactKeys(value, ['type']) ? { type: value.type } : null;
  }
  if (value.type === 'strike') {
    return hasExactKeys(value, ['type', 'targetId']) && isSafeClientId(value.targetId)
      ? { type: 'strike', targetId: value.targetId }
      : null;
  }
  if (value.type === 'skill') {
    if (!hasExactKeys(value, ['skillId', 'targetId', 'type']) || !isSafeClientId(value.targetId))
      return null;
    if (value.skillId !== 'piercing-lunge' && value.skillId !== 'ward-break') return null;
    return { type: 'skill', skillId: value.skillId, targetId: value.targetId };
  }
  if (value.type === 'item') {
    if (!hasExactKeys(value, ['itemId', 'targetId', 'type']) || value.itemId !== 'field-draught')
      return null;
    return isSafeClientId(value.targetId)
      ? { type: 'item', itemId: 'field-draught', targetId: value.targetId }
      : null;
  }
  if (value.type === 'shift') {
    if (!hasExactKeys(value, ['stance', 'type'])) return null;
    if (
      value.stance !== 'balanced' &&
      value.stance !== 'aggressive' &&
      value.stance !== 'defensive'
    ) {
      return null;
    }
    return { type: 'shift', stance: value.stance };
  }
  return null;
}

function isSafeClientId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 80 &&
    /^[A-Za-z0-9._-]+$/.test(value)
  );
}

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
    ROUTE_NOT_FOUND: [404, '探索ルートが見つかりません。'],
    ROUTE_STATE_CONFLICT: [409, '探索状態が更新されました。最新状態を取得してください。'],
    ROUTE_EXPIRED: [410, '探索ルートの期限が切れました。街へ戻ってください。'],
    INVALID_ROUTE: [409, '探索状態の順序が不正です。最新状態を取得してください。'],
    ENCOUNTER_NOT_FOUND: [404, '遭遇が見つかりません。'],
    INVALID_COMBAT_STATE: [400, '戦闘状態を読み取れません。'],
    INVENTORY_FULL: [409, '持ち物の空きがありません。'],
    ITEM_NOT_FOUND: [404, '対象アイテムが見つかりません。'],
    ITEM_EQUIPPED: [409, '装備中のアイテムは先に外してください。'],
    ITEM_PROTECTED: [409, 'ロックまたはfavorite保護を解除してください。'],
    CONFIRMATION_REQUIRED: [409, 'Rare以上の分解には明示確認が必要です。'],
    INVALID_INVENTORY_REQUEST: [400, '持ち物操作の形式が不正です。'],
    INVENTORY_STATE_CONFLICT: [409, '持ち物の状態が更新されました。最新状態を取得してください。'],
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
