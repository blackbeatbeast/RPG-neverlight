import { useEffect, useMemo, useState } from 'react';

import './styles.css';

type VerticalCommand = { type: 'guard' } | { targetId: string; type: 'strike' } | { type: 'flee' };

interface VerticalEncounter {
  encounterId: string;
  encounterVersion: string;
  pattern: string;
  status: 'active' | 'resolved';
  combatState: {
    enemies: Array<{
      id: string;
      name: string;
      vitality: number;
      maxVitality: number;
    }>;
    player: { vitality: number; maxVitality: number };
    telegraphs: Array<{ attackId: string; counterplay: string; intensity: string }>;
    outcome: string;
    turn: number;
  };
  lastResolution: {
    outputStateHash?: string;
    resolutionHash?: string;
    state?: { outcome: string };
  } | null;
}

interface VerticalRoute {
  routeRunId: string;
  routeId: string;
  routeVersion: string;
  phase: 'exploration' | 'encounter' | 'result' | 'complete' | 'expired';
  version: number;
  nodeId: string;
  expiresAt: string;
  serverSeedHash: string | null;
  encounter: VerticalEncounter | null;
}

interface ApiErrorPayload {
  error?: { code?: string; message?: string };
}

interface RoutePayload {
  route: VerticalRoute;
  replayed?: boolean;
}

interface ApiResponse<T> {
  response: Response;
  value: T;
}

type Stage = 'landing' | 'route' | 'encounter' | 'result' | 'complete' | 'expired' | 'read-only';

function csrfToken(): string {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('neverlight_csrf='));
  return entry ? decodeURIComponent(entry.slice('neverlight_csrf='.length)) : '';
}

function idempotencyKey(action: string): string {
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? 0}`;
  return `vertical-${action}-${suffix}`;
}

function stageForRoute(route: VerticalRoute): Stage {
  if (route.phase === 'exploration') return 'route';
  if (route.phase === 'encounter') return 'encounter';
  if (route.phase === 'result') return 'result';
  if (route.phase === 'complete') return 'complete';
  return 'expired';
}

async function readApi<T>(response: Response): Promise<ApiResponse<T>> {
  const value = (await response.json()) as T;
  return { response, value };
}

async function getRoute(): Promise<VerticalRoute | null> {
  const result = await readApi<{ route: VerticalRoute | null }>(
    await fetch('/api/v1/routes/current', { credentials: 'include' }),
  );
  if (result.response.status === 401) return null;
  if (!result.response.ok) throw new Error(apiError(result.value));
  return result.value.route;
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  action: string,
): Promise<T & { replayed?: boolean }> {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey(action),
      'X-CSRF-Token': csrfToken(),
    },
    method: 'POST',
  });
  const result = await readApi<T & ApiErrorPayload & { replayed?: boolean }>(response);
  if (!response.ok) throw new Error(apiError(result.value));
  return result.value;
}

function apiError(value: unknown): string {
  const message = (value as ApiErrorPayload).error?.message;
  return message ?? 'サーバーとの通信に失敗しました。';
}

export function VerticalSliceApp() {
  const readOnlyRequested = useMemo(
    () => new URLSearchParams(window.location.search).get('readOnly') === '1',
    [],
  );
  const [stage, setStage] = useState<Stage>(readOnlyRequested ? 'read-only' : 'landing');
  const [route, setRoute] = useState<VerticalRoute | null>(null);
  const [queue, setQueue] = useState<VerticalCommand[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (readOnlyRequested) return;
    let active = true;
    void getRoute()
      .then((current) => {
        if (!active || !current) return;
        setRoute(current);
        setStage(stageForRoute(current));
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(error instanceof Error ? error.message : '再開状態を取得できません。');
      });
    return () => {
      active = false;
    };
  }, [readOnlyRequested]);

  async function startRoute(): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      const sessionResponse = await fetch('/api/v1/guest/start', {
        credentials: 'include',
        method: 'POST',
      });
      if (!sessionResponse.ok) throw new Error(apiError(await sessionResponse.json()));
      const result = await postJson<RoutePayload>('/api/v1/routes/glass-marsh/start', {}, 'start');
      setRoute(result.route);
      setStage(stageForRoute(result.route));
      setMessage('ゲストセッションとルートを開始しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ルートを開始できません。');
    } finally {
      setBusy(false);
    }
  }

  async function chooseEncounter(): Promise<void> {
    if (!route) return;
    setBusy(true);
    try {
      const result = await postJson<RoutePayload>(
        '/api/v1/routes/current/choose',
        {
          expectedVersion: route.version,
          nodeId: 'encounter',
        },
        'choose',
      );
      setRoute(result.route);
      setStage(stageForRoute(result.route));
      setMessage('サーバーが遭遇と予兆を選択しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '遭遇を開始できません。');
    } finally {
      setBusy(false);
    }
  }

  function addCommand(command: VerticalCommand): void {
    setQueue((current) => (current.length >= 3 ? current : [...current, command]));
    setMessage('命令をキューに追加しました。');
  }

  async function resolveQueuedCommands(): Promise<void> {
    if (!route || !route.encounter || queue.length === 0) return;
    setBusy(true);
    try {
      const result = await postJson<RoutePayload & { resolution?: { resolutionHash?: string } }>(
        '/api/v1/routes/current/combat',
        { commands: queue, expectedVersion: route.version },
        'combat',
      );
      setRoute(result.route);
      setQueue([]);
      setStage(stageForRoute(result.route));
      setMessage(
        result.replayed
          ? '同じ命令の再送でした。保存済みの結果を表示しています。'
          : `戦闘結果を保存しました。hash: ${result.resolution?.resolutionHash ?? 'stored'}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '戦闘を解決できません。');
    } finally {
      setBusy(false);
    }
  }

  async function exitRoute(): Promise<void> {
    if (!route) return;
    setBusy(true);
    try {
      const result = await postJson<RoutePayload>(
        '/api/v1/routes/current/exit',
        {
          expectedVersion: route.version,
        },
        'exit',
      );
      setRoute(result.route);
      setStage(stageForRoute(result.route));
      setMessage('ルートを安全に終了しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ルートを終了できません。');
    } finally {
      setBusy(false);
    }
  }

  const title =
    stage === 'landing'
      ? '実APIの縦切り'
      : stage === 'route'
        ? '硝子沼の水路'
        : stage === 'encounter'
          ? '硝子沼の鐘守'
          : stage === 'result'
            ? '遭遇の記録'
            : stage === 'complete'
              ? 'ルート完了'
              : '読み取り専用';

  return (
    <div
      className="app-root"
      data-density="comfortable"
      data-theme="retro"
      data-testid="vertical-slice"
    >
      <a className="skip-link" href="#vertical-main">
        本文へ移動
      </a>
      <div className="app-frame">
        <header className="site-header">
          <div className="brand-block">
            <span className="brand-button" role="img" aria-label="PROJECT NEVERLIGHT Vesper Ark">
              <span aria-hidden="true" className="brand-mark">
                N
              </span>
              <span>
                <span className="brand-kicker">PROJECT NEVERLIGHT</span>
                <span className="brand-name">Vesper Ark / API</span>
              </span>
            </span>
          </div>
          <div className="header-meta" aria-label="実APIの状態">
            <span className="meta-stamp">SERVER</span>
            <span>{readOnlyRequested ? 'READ ONLY' : 'VERTICAL SLICE'}</span>
            <span>JA / CSRF</span>
          </div>
        </header>

        <div className="status-strip" role="status" aria-label="運用状態">
          <span className="status-item status-item--steady">
            <span aria-hidden="true">●</span> API接続: local
          </span>
          <span className="status-item">
            <span aria-hidden="true">▣</span> サーバー権威 / version付き
          </span>
          <span className="status-item">
            <span aria-hidden="true">◌</span> 画像・音声なし
          </span>
        </div>

        <div className="main-layout">
          <main className="page-shell" id="vertical-main" tabIndex={-1}>
            <header className="page-heading">
              <p className="eyebrow">EXPLORATION / API VERTICAL SLICE</p>
              <h1 id="page-title">{title}</h1>
              <p className="page-description">
                {stage === 'read-only'
                  ? '現在地を確認できます。書き込みは停止され、破壊的な操作は行いません。'
                  : 'route → encounter → combat → result をサーバー保存状態で再開できます。'}
              </p>
            </header>

            {stage === 'landing' ? (
              <section className="content-grid">
                <article className="info-panel">
                  <p className="eyebrow">START / GUEST</p>
                  <h2>短いルートを開始</h2>
                  <p>ゲストセッションを作成し、サーバーが選ぶ硝子沼の水路へ進みます。</p>
                  <p className="muted-copy">
                    seed・結果・プレイヤー状態はブラウザから指定できません。
                  </p>
                  <button
                    className="command-button vertical-primary"
                    disabled={busy}
                    type="button"
                    onClick={() => void startRoute()}
                  >
                    <span aria-hidden="true" className="command-key">
                      1
                    </span>
                    <span className="command-copy">
                      <strong>実APIルートを開始</strong>
                      <span>ゲストとして硝子沼へ進む</span>
                    </span>
                  </button>
                </article>
              </section>
            ) : null}

            {stage === 'route' && route ? (
              <section className="content-grid">
                <article className="info-panel">
                  <p className="eyebrow">ROUTE / {route.routeVersion}</p>
                  <h2>入口を選ぶ</h2>
                  <p>
                    サーバーがルートversionと期限を保持しています。現在のnodeは {route.nodeId}{' '}
                    です。
                  </p>
                  <dl className="detail-list vertical-details">
                    <div>
                      <dt>Route run</dt>
                      <dd>{route.routeRunId}</dd>
                    </div>
                    <div>
                      <dt>Version</dt>
                      <dd>{route.version}</dd>
                    </div>
                    <div>
                      <dt>Seed hash</dt>
                      <dd>{route.serverSeedHash}</dd>
                    </div>
                  </dl>
                  <button
                    className="command-button vertical-primary"
                    disabled={busy}
                    type="button"
                    onClick={() => void chooseEncounter()}
                  >
                    <span aria-hidden="true" className="command-key">
                      1
                    </span>
                    <span className="command-copy">
                      <strong>遭遇を選ぶ</strong>
                      <span>サーバー選択の予兆を読む</span>
                    </span>
                  </button>
                </article>
              </section>
            ) : null}

            {stage === 'encounter' && route?.encounter ? (
              <section className="content-grid">
                <article className="info-panel">
                  <p className="eyebrow">ENCOUNTER / {route.encounter.encounterVersion}</p>
                  <h2>硝子沼の鐘守</h2>
                  <p>
                    pattern: {route.encounter.pattern} / turn: {route.encounter.combatState.turn}
                  </p>
                  <StateBadge label="予兆を読んで命令を送信" tone="warning" />
                  {route.encounter.combatState.telegraphs.map((telegraph) => (
                    <p className="vertical-telegraph" key={telegraph.attackId}>
                      {telegraph.attackId} / counterplay: {telegraph.counterplay} /{' '}
                      {telegraph.intensity}
                    </p>
                  ))}
                  <p>
                    Player {route.encounter.combatState.player.vitality}/
                    {route.encounter.combatState.player.maxVitality} · Enemy{' '}
                    {route.encounter.combatState.enemies[0]?.vitality}/
                    {route.encounter.combatState.enemies[0]?.maxVitality}
                  </p>
                </article>
                <section className="queue-panel" aria-labelledby="vertical-queue-title">
                  <p className="eyebrow">COMMAND QUEUE / {queue.length}/3</p>
                  <h2 id="vertical-queue-title">命令キュー</h2>
                  <ol className="queue-list">
                    {queue.map((command, index) => (
                      <li key={`${command.type}-${index}`}>
                        <span className="queue-number">{index + 1}</span>
                        {command.type}
                      </li>
                    ))}
                  </ol>
                  <div className="vertical-command-row">
                    <button
                      className="command-button"
                      disabled={busy || queue.length >= 3}
                      type="button"
                      onClick={() =>
                        addCommand({
                          type: 'strike',
                          targetId:
                            route.encounter?.combatState.enemies[0]?.id ??
                            'enemy.heavy-telegraph.1',
                        })
                      }
                    >
                      <span aria-hidden="true" className="command-key">
                        1
                      </span>
                      <span className="command-copy">
                        <strong>攻撃</strong>
                        <span>server combat command</span>
                      </span>
                    </button>
                    <button
                      className="command-button"
                      disabled={busy || queue.length >= 3}
                      type="button"
                      onClick={() => addCommand({ type: 'guard' })}
                    >
                      <span aria-hidden="true" className="command-key">
                        2
                      </span>
                      <span className="command-copy">
                        <strong>防御</strong>
                        <span>heavy telegraph counter</span>
                      </span>
                    </button>
                    <button
                      className="command-button"
                      disabled={busy || queue.length >= 3}
                      type="button"
                      onClick={() => addCommand({ type: 'flee' })}
                    >
                      <span aria-hidden="true" className="command-key">
                        3
                      </span>
                      <span className="command-copy">
                        <strong>逃走</strong>
                        <span>safe exit attempt</span>
                      </span>
                    </button>
                  </div>
                  <button
                    className="command-button vertical-primary"
                    disabled={busy || queue.length === 0}
                    type="button"
                    onClick={() => void resolveQueuedCommands()}
                  >
                    <span aria-hidden="true" className="command-key">
                      4
                    </span>
                    <span className="command-copy">
                      <strong>命令を解決</strong>
                      <span>server resolves and persists the result</span>
                    </span>
                  </button>
                </section>
              </section>
            ) : null}

            {stage === 'result' && route ? (
              <section className="content-grid">
                <article className="info-panel">
                  <p className="eyebrow">RESULT / PERSISTED</p>
                  <h2>戦闘結果を確認</h2>
                  <p>結果はserver-side resolutionとして保存され、seedはブラウザへ返しません。</p>
                  <dl className="detail-list vertical-details">
                    <div>
                      <dt>Outcome</dt>
                      <dd>{route.encounter?.combatState.outcome}</dd>
                    </div>
                    <div>
                      <dt>Output state hash</dt>
                      <dd>{route.encounter?.lastResolution?.outputStateHash}</dd>
                    </div>
                    <div>
                      <dt>Resolution hash</dt>
                      <dd>{route.encounter?.lastResolution?.resolutionHash}</dd>
                    </div>
                  </dl>
                  <button
                    className="command-button vertical-primary"
                    disabled={busy}
                    type="button"
                    onClick={() => void exitRoute()}
                  >
                    <span aria-hidden="true" className="command-key">
                      1
                    </span>
                    <span className="command-copy">
                      <strong>結果を確認して退出</strong>
                      <span>POST後にGET可能な完了状態へ進む</span>
                    </span>
                  </button>
                </article>
              </section>
            ) : null}

            {stage === 'complete' ? (
              <StatePanel
                label="ルート完了"
                message="退出結果は保存済みです。ブラウザを閉じても完了状態を再取得できます。"
                tone="good"
              />
            ) : null}
            {stage === 'expired' ? (
              <StatePanel
                label="期限切れ"
                message="このルートは期限切れです。書き込みは拒否され、街へ戻る案内だけを表示します。"
                tone="warning"
              />
            ) : null}
            {stage === 'read-only' ? (
              <StatePanel
                label="読み取り専用"
                message="運用状態はread-onlyです。現在地確認以外のmutationは503で拒否されます。"
                tone="warning"
              />
            ) : null}
            {message ? (
              <p aria-live="polite" className="vertical-message">
                {message}
              </p>
            ) : null}
          </main>

          <aside className="session-rail" aria-labelledby="vertical-session-title">
            <p className="eyebrow">SESSION / VERTICAL</p>
            <h2 id="vertical-session-title">安全な再開</h2>
            <dl className="rail-list">
              <div>
                <dt>State</dt>
                <dd>{stage}</dd>
              </div>
              <div>
                <dt>Writes</dt>
                <dd>{readOnlyRequested ? 'blocked' : 'CSRF + key'}</dd>
              </div>
              <div>
                <dt>Authority</dt>
                <dd>server</dd>
              </div>
            </dl>
            <p className="rail-note">
              更新・戻る・再送は保存済みversionとIdempotency-Keyで保護されます。
            </p>
          </aside>
        </div>
        <footer className="site-footer">
          <span>NEVERLIGHT / API VERTICAL</span>
          <span>route version 1.0.0</span>
          <span>seed hash only</span>
        </footer>
      </div>
    </div>
  );
}

function StateBadge({ label, tone }: { label: string; tone: 'good' | 'steady' | 'warning' }) {
  return (
    <span className={`state-badge state-badge--${tone}`}>
      <span aria-hidden="true">{tone === 'good' ? '✓' : tone === 'warning' ? '!' : '•'}</span>
      {label}
    </span>
  );
}

function StatePanel({
  label,
  message,
  tone,
}: {
  label: string;
  message: string;
  tone: 'good' | 'warning';
}) {
  return (
    <section aria-live="polite" className={`state-panel state-panel--${tone}`} role="status">
      <p className="eyebrow">STATE / {tone.toUpperCase()}</p>
      <h2>{label}</h2>
      <p>{message}</p>
      <StateBadge label={label} tone={tone} />
    </section>
  );
}
