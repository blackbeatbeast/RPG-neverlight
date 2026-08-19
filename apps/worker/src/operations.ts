export type OperationalMode = 'normal' | 'degraded' | 'read-only' | 'maintenance';

export interface OperationalEnvironment {
  readonly OPERATION_MODE?: string;
  readonly READ_ONLY?: string;
  readonly MAINTENANCE?: string;
  readonly BUDGET_WINDOW_SECONDS?: string;
  readonly BUDGET_REQUEST_LIMIT?: string;
  readonly BUDGET_WRITE_LIMIT?: string;
  readonly BUDGET_DEGRADED_REQUESTS?: string;
  readonly BUDGET_READ_ONLY_REQUESTS?: string;
  readonly BUDGET_DEGRADED_WRITES?: string;
  readonly BUDGET_READ_ONLY_WRITES?: string;
}

export interface BudgetSettings {
  readonly windowSeconds: number;
  readonly requestLimit: number;
  readonly writeLimit: number;
  readonly degradedRequests: number;
  readonly readOnlyRequests: number;
  readonly degradedWrites: number;
  readonly readOnlyWrites: number;
}

export interface BudgetSnapshot {
  readonly mode: OperationalMode;
  readonly reason: string;
  readonly windowStartedAt: number;
  readonly windowResetsAt: number;
  readonly requestCount: number;
  readonly writeCount: number;
  readonly settings: BudgetSettings;
}

const DEFAULTS = {
  windowSeconds: 86_400,
  requestLimit: 50_000,
  writeLimit: 40_000,
} as const;

function positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function threshold(
  value: string | undefined,
  fallback: number,
  limit: number,
  minimum: number,
): number {
  return Math.max(minimum, Math.min(positiveInteger(value, fallback, limit), limit));
}

export function readBudgetSettings(environment: OperationalEnvironment): BudgetSettings {
  const windowSeconds = positiveInteger(
    environment.BUDGET_WINDOW_SECONDS,
    DEFAULTS.windowSeconds,
    604_800,
  );
  const requestLimit = positiveInteger(
    environment.BUDGET_REQUEST_LIMIT,
    DEFAULTS.requestLimit,
    10_000_000,
  );
  const writeLimit = positiveInteger(
    environment.BUDGET_WRITE_LIMIT,
    DEFAULTS.writeLimit,
    10_000_000,
  );
  const degradedRequests = threshold(
    environment.BUDGET_DEGRADED_REQUESTS,
    Math.ceil(requestLimit * 0.65),
    requestLimit,
    1,
  );
  const readOnlyRequests = threshold(
    environment.BUDGET_READ_ONLY_REQUESTS,
    Math.ceil(requestLimit * 0.8),
    requestLimit,
    degradedRequests,
  );
  const degradedWrites = threshold(
    environment.BUDGET_DEGRADED_WRITES,
    Math.ceil(writeLimit * 0.7),
    writeLimit,
    1,
  );
  const readOnlyWrites = threshold(
    environment.BUDGET_READ_ONLY_WRITES,
    Math.ceil(writeLimit * 0.9),
    writeLimit,
    degradedWrites,
  );
  return {
    windowSeconds,
    requestLimit,
    writeLimit,
    degradedRequests,
    readOnlyRequests,
    degradedWrites,
    readOnlyWrites,
  };
}

function enabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function forcedMode(
  environment: OperationalEnvironment,
): { mode: OperationalMode; reason: string } | null {
  if (enabled(environment.MAINTENANCE) || environment.OPERATION_MODE === 'maintenance') {
    return { mode: 'maintenance', reason: 'forced:maintenance' };
  }
  if (enabled(environment.READ_ONLY) || environment.OPERATION_MODE === 'read-only') {
    return { mode: 'read-only', reason: 'forced:read-only' };
  }
  if (environment.OPERATION_MODE === 'degraded') {
    return { mode: 'degraded', reason: 'forced:degraded' };
  }
  return null;
}

function resolveMode(
  environment: OperationalEnvironment,
  requestCount: number,
  writeCount: number,
  settings: BudgetSettings,
): { mode: OperationalMode; reason: string } {
  const forced = forcedMode(environment);
  if (forced) return forced;
  if (requestCount >= settings.readOnlyRequests)
    return { mode: 'read-only', reason: 'budget:request-read-only-threshold' };
  if (writeCount >= settings.readOnlyWrites)
    return { mode: 'read-only', reason: 'budget:write-read-only-threshold' };
  if (requestCount >= settings.degradedRequests)
    return { mode: 'degraded', reason: 'budget:request-degraded-threshold' };
  if (writeCount >= settings.degradedWrites)
    return { mode: 'degraded', reason: 'budget:write-degraded-threshold' };
  return { mode: 'normal', reason: 'within-budget' };
}

function snapshot(
  environment: OperationalEnvironment,
  windowStartedAt: number,
  requestCount: number,
  writeCount: number,
): BudgetSnapshot {
  const settings = readBudgetSettings(environment);
  const resolved = resolveMode(environment, requestCount, writeCount, settings);
  return {
    ...resolved,
    windowStartedAt,
    windowResetsAt: windowStartedAt + settings.windowSeconds,
    requestCount,
    writeCount,
    settings,
  };
}

function countedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') && pathname !== '/api/health' && pathname !== '/api/v1/operations'
  );
}

function writeMethod(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

/**
 * Tracks a deliberately conservative per-isolate budget window. D1/provider analytics remain
 * authoritative for account-wide totals; this tracker is the fast local/preview kill switch.
 */
export class BudgetTracker {
  private windowStartedAt = 0;
  private requestCount = 0;
  private writeCount = 0;

  observe(
    environment: OperationalEnvironment,
    method: string,
    pathname: string,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): BudgetSnapshot {
    const settings = readBudgetSettings(environment);
    const windowStartedAt =
      Math.floor(nowSeconds / settings.windowSeconds) * settings.windowSeconds;
    if (this.windowStartedAt !== windowStartedAt) {
      this.windowStartedAt = windowStartedAt;
      this.requestCount = 0;
      this.writeCount = 0;
    }
    if (countedPath(pathname)) {
      this.requestCount += 1;
      if (writeMethod(method)) this.writeCount += 1;
    }
    return snapshot(environment, this.windowStartedAt, this.requestCount, this.writeCount);
  }

  current(
    environment: OperationalEnvironment,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): BudgetSnapshot {
    const settings = readBudgetSettings(environment);
    const windowStartedAt =
      Math.floor(nowSeconds / settings.windowSeconds) * settings.windowSeconds;
    if (this.windowStartedAt !== windowStartedAt) {
      this.windowStartedAt = windowStartedAt;
      this.requestCount = 0;
      this.writeCount = 0;
    }
    return snapshot(environment, this.windowStartedAt, this.requestCount, this.writeCount);
  }
}

export function operationMessage(mode: OperationalMode): string {
  if (mode === 'maintenance') return '保守中です。ヘルスと運用状態の確認だけ利用できます。';
  if (mode === 'read-only')
    return '現在は読み取り専用です。現在地の確認と退出案内だけ利用できます。';
  if (mode === 'degraded') return '混雑を抑えるため一部の低優先度操作を縮退しています。';
  return '通常運用です。サーバー権威の操作を受け付けます。';
}
