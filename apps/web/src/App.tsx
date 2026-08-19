import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import {
  DEFAULT_PREFERENCES,
  getCommandForKey,
  getCommandsForScreen,
  isEditableTarget,
  localized,
  loadPreferences,
  PREFERENCES_STORAGE_KEY,
  resolveText,
  SCREEN_DEFINITIONS,
  serializePreferences,
  type CommandAction,
  type LocalizedText,
  type ScreenCommand,
  type ScreenId,
  type UiPreferences,
} from './app-model.js';
import { UI_FIXTURES, type SceneFixture } from './fixtures.js';
import { InventorySliceApp } from './InventorySlice.js';
import { VerticalSliceApp } from './VerticalSlice.js';

import './styles.css';

const UTILITY_NAV: Array<{ label: LocalizedText; screen: ScreenId }> = [
  { label: localized('街', 'Town'), screen: 'town' },
  { label: localized('持ち物', 'Inventory'), screen: 'inventory' },
  { label: localized('記録庫', 'Codex'), screen: 'codex' },
  { label: localized('設定', 'Settings'), screen: 'settings' },
];

const LIVE_COPY = {
  densityCompact: localized('表示密度をコンパクトにしました。', 'Compact density selected.'),
  densityComfortable: localized('表示密度をゆったりにしました。', 'Comfortable density selected.'),
  genericBack: localized('前の画面へ戻りました。', 'Returned to the previous screen.'),
  queued: localized('命令をキューに追加しました。', 'Command added to the queue.'),
  themeModern: localized('Modernテーマに切り替えました。', 'Modern theme selected.'),
  themeRetro: localized('Retroテーマに切り替えました。', 'Retro theme selected.'),
};

function text(value: LocalizedText, preferences: UiPreferences): string {
  return resolveText(value, preferences.locale);
}

function getStoredPreferences(): UiPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };
  return loadPreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
}

function getScene(screen: ScreenId): SceneFixture {
  if (screen === 'landing') return UI_FIXTURES.scenes.landing;
  if (screen === 'town' || screen === 'routes') return UI_FIXTURES.scenes.town;
  if (screen === 'exploration' || screen === 'encounter') return UI_FIXTURES.scenes.encounter;
  return UI_FIXTURES.scenes.result;
}

function formatScreenAnnouncement(screen: ScreenId, preferences: UiPreferences): string {
  return `${text(SCREEN_DEFINITIONS[screen].title, preferences)}。${text(SCREEN_DEFINITIONS[screen].description, preferences)}`;
}

export function App() {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const vertical = params.get('vertical') === '1';
  const inventory = params.get('inventory') === '1';
  if (inventory) return <InventorySliceApp />;
  return vertical ? <VerticalSliceApp /> : <ShellApp />;
}

function ShellApp() {
  const [history, setHistory] = useState<ScreenId[]>([]);
  const [preferences, setPreferences] = useState<UiPreferences>(getStoredPreferences);
  const [screen, setScreen] = useState<ScreenId>('landing');
  const [queuedCommands, setQueuedCommands] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState(() =>
    formatScreenAnnouncement('landing', getStoredPreferences()),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  const screenDefinition = SCREEN_DEFINITIONS[screen];
  const commands = useMemo(
    () => getCommandsForScreen(screen, queuedCommands.length, preferences),
    [preferences, queuedCommands.length, screen],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, serializePreferences(preferences));
    } catch {
      setAnnouncement('設定をこの環境に保存できませんでした。表示は続行できます。');
    }
  }, [preferences]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen]);

  const announceScreen = (nextScreen: ScreenId) => {
    setAnnouncement(formatScreenAnnouncement(nextScreen, preferences));
  };

  const navigate = (nextScreen: ScreenId) => {
    if (nextScreen === screen) return;
    setHistory((previous) => [...previous, screen]);
    setScreen(nextScreen);
    announceScreen(nextScreen);
  };

  const goBack = () => {
    const previousScreen = history.at(-1);
    if (!previousScreen) {
      setAnnouncement(text(LIVE_COPY.genericBack, preferences));
      return;
    }
    setHistory((previous) => previous.slice(0, -1));
    setScreen(previousScreen);
    announceScreen(previousScreen);
  };

  const executeAction = (action: CommandAction) => {
    switch (action.type) {
      case 'back':
        goBack();
        return;
      case 'navigate':
        navigate(action.target);
        return;
      case 'queue':
        setQueuedCommands((previous) => [...previous, action.commandId].slice(0, 3));
        setAnnouncement(
          `${text(action.label, preferences)}。${text(LIVE_COPY.queued, preferences)}`,
        );
        return;
      case 'resolve':
        navigate('result');
        return;
      case 'toggle-density':
        setPreferences((previous) => ({
          ...previous,
          density: previous.density === 'compact' ? 'comfortable' : 'compact',
        }));
        setAnnouncement(
          text(
            preferences.density === 'compact'
              ? LIVE_COPY.densityComfortable
              : LIVE_COPY.densityCompact,
            preferences,
          ),
        );
        return;
      case 'toggle-theme':
        setPreferences((previous) => ({
          ...previous,
          theme: previous.theme === 'retro' ? 'modern' : 'retro',
        }));
        setAnnouncement(
          text(
            preferences.theme === 'retro' ? LIVE_COPY.themeModern : LIVE_COPY.themeRetro,
            preferences,
          ),
        );
        return;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      const command = getCommandForKey(commands, event.key);
      if (!command || command.disabled) {
        if (event.key !== 'Escape' && event.key !== '0') return;
        if (screen === 'landing') return;
        event.preventDefault();
        goBack();
        return;
      }
      event.preventDefault();
      executeAction(command.action);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commands, history, preferences, screen]);

  const scene = getScene(screen);
  const sceneStyle = { '--scene-motif': `url(#${scene.motif})` } as CSSProperties;

  return (
    <div
      className="app-root"
      data-density={preferences.density}
      data-theme={preferences.theme}
      data-screen={screen}
    >
      <a className="skip-link" href="#main-content">
        {text(localized('本文へ移動', 'Skip to content'), preferences)}
      </a>

      <div className="app-frame">
        <header className="site-header">
          <div className="brand-block">
            <button className="brand-button" type="button" onClick={() => navigate('landing')}>
              <span className="brand-mark" aria-hidden="true">
                N
              </span>
              <span>
                <span className="brand-kicker">PROJECT NEVERLIGHT</span>
                <span className="brand-name">Vesper Ark</span>
              </span>
            </button>
          </div>
          <div
            className="header-meta"
            aria-label={text(localized('現在の設定', 'Current settings'), preferences)}
          >
            <span className="meta-stamp">{preferences.theme.toUpperCase()}</span>
            <span>{preferences.density === 'compact' ? 'COMPACT' : 'COMFORTABLE'}</span>
            <span>JA / FIXTURE</span>
          </div>
        </header>

        <nav
          className="utility-nav"
          aria-label={text(localized('補助ナビゲーション', 'Utility navigation'), preferences)}
        >
          {UTILITY_NAV.map((item) => (
            <button
              aria-current={screen === item.screen ? 'page' : undefined}
              className="utility-link"
              key={item.screen}
              type="button"
              onClick={() => navigate(item.screen)}
            >
              {text(item.label, preferences)}
            </button>
          ))}
        </nav>

        <div
          className="status-strip"
          role="status"
          aria-label={text(localized('運用状態', 'Operational status'), preferences)}
        >
          <span className="status-item status-item--steady">
            <span aria-hidden="true">●</span>{' '}
            {text(localized('接続: local', 'Connection: local'), preferences)}
          </span>
          <span className="status-item">
            <span aria-hidden="true">▣</span>{' '}
            {text(localized('読み取り専用fixture', 'Read-only fixture'), preferences)}
          </span>
          <span className="status-item">
            <span aria-hidden="true">◌</span>{' '}
            {text(localized('音声なし / 動き任意', 'No audio / motion optional'), preferences)}
          </span>
        </div>

        <div className="main-layout">
          <main className="page-shell" id="main-content" tabIndex={-1}>
            <header className="page-heading">
              <p className="eyebrow">{text(screenDefinition.eyebrow, preferences)}</p>
              <h1 ref={headingRef} id="page-title" tabIndex={-1}>
                {text(screenDefinition.title, preferences)}
              </h1>
              <p className="page-description">{text(screenDefinition.description, preferences)}</p>
            </header>

            <ScreenContent
              locale={preferences.locale}
              queuedCommands={queuedCommands}
              scene={scene}
              screen={screen}
              style={sceneStyle}
            />

            <CommandPanel
              commands={commands}
              locale={preferences.locale}
              onCommand={executeAction}
            />
          </main>

          <aside className="session-rail" aria-labelledby="session-rail-title">
            <p className="eyebrow">SESSION / 01</p>
            <h2 id="session-rail-title">
              {text(localized('小さなセッション', 'Small session'), preferences)}
            </h2>
            <dl className="rail-list">
              <div>
                <dt>{text(localized('場所', 'Location'), preferences)}</dt>
                <dd>Rainbell Quay</dd>
              </div>
              <div>
                <dt>{text(localized('操作', 'Input'), preferences)}</dt>
                <dd>Touch / Keys</dd>
              </div>
              <div>
                <dt>{text(localized('状態', 'State'), preferences)}</dt>
                <dd>{text(localized('安定', 'Steady'), preferences)}</dd>
              </div>
            </dl>
            <p className="rail-note">
              {text(
                localized('1〜9で選択 / 0またはEscapeで戻る', '1–9 select / 0 or Escape back'),
                preferences,
              )}
            </p>
          </aside>
        </div>

        <footer className="site-footer">
          <span>NEVERLIGHT / FOUNDATION UI</span>
          <span>{text(localized('first-region 0.4', 'first-region 0.4'), preferences)}</span>
          <span>
            {text(
              localized(
                '画像出所: 承認前の抽象placeholder',
                'Image source: unapproved abstract placeholder',
              ),
              preferences,
            )}
          </span>
        </footer>
      </div>

      <div aria-atomic="true" aria-live="polite" className="visually-hidden" role="status">
        {announcement}
      </div>
    </div>
  );
}

interface ScreenContentProps {
  locale: UiPreferences['locale'];
  queuedCommands: string[];
  scene: SceneFixture;
  screen: ScreenId;
  style: CSSProperties;
}

function ScreenContent({ locale, queuedCommands, scene, screen, style }: ScreenContentProps) {
  return (
    <div
      className="screen-content"
      data-information-key="canonical-shell"
      data-screen-content="true"
    >
      {['landing', 'town', 'routes', 'exploration', 'encounter', 'result', 'loot'].includes(
        screen,
      ) ? (
        <SceneCard locale={locale} scene={scene} style={style} />
      ) : null}
      {screen === 'landing' ? <LandingContent locale={locale} /> : null}
      {screen === 'town' ? <TownContent locale={locale} /> : null}
      {screen === 'routes' ? <RoutesContent locale={locale} /> : null}
      {screen === 'exploration' ? <ExplorationContent locale={locale} /> : null}
      {screen === 'encounter' ? (
        <EncounterContent locale={locale} queuedCommands={queuedCommands} />
      ) : null}
      {screen === 'result' ? (
        <ResultContent locale={locale} queuedCommands={queuedCommands} />
      ) : null}
      {screen === 'loot' ? <LootContent locale={locale} /> : null}
      {screen === 'inventory' ? <InventoryContent locale={locale} /> : null}
      {screen === 'codex' ? <CodexContent locale={locale} /> : null}
      {screen === 'settings' ? <SettingsContent locale={locale} /> : null}
      {screen === 'maintenance' ? <MaintenanceContent locale={locale} /> : null}
      {screen === 'empty' ? <EmptyContent locale={locale} /> : null}
      {screen === 'error' ? <ErrorContent locale={locale} /> : null}
    </div>
  );
}

function SceneCard({
  locale,
  scene,
  style,
}: {
  locale: UiPreferences['locale'];
  scene: SceneFixture;
  style: CSSProperties;
}) {
  return (
    <figure className={`scene-card scene-card--${scene.motif}`} style={style}>
      <div aria-label={resolveText(scene.alt, locale)} className="scene-art" role="img">
        <span aria-hidden="true" className="scene-art__orb scene-art__orb--one" />
        <span aria-hidden="true" className="scene-art__orb scene-art__orb--two" />
        <span aria-hidden="true" className="scene-art__grid" />
        <span className="scene-art__fallback">{resolveText(scene.caption, locale)}</span>
      </div>
      <figcaption>
        <span className="scene-caption-label">SCENE / FIXTURE</span>
        <span>{resolveText(scene.caption, locale)}</span>
      </figcaption>
    </figure>
  );
}

function LandingContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <div className="content-grid">
      <InfoPanel
        label="01 / OPENING"
        locale={locale}
        title={localized('ページを開く', 'Open the page')}
      >
        <p>
          {resolveText(
            localized(
              'ここには短いセッションだけがある。画像がなくても、文字と番号で進めます。',
              'A short session lives here. Text and numbered commands keep it usable without images.',
            ),
            locale,
          )}
        </p>
        <ul className="bullet-list">
          <li>{resolveText(localized('1〜3手の命令ログ', 'A 1–3 command log'), locale)}</li>
          <li>
            {resolveText(localized('読み取り専用のfixture', 'Read-only fixture state'), locale)}
          </li>
          <li>
            {resolveText(
              localized('音声・必須アニメーションなし', 'No audio or required animation'),
              locale,
            )}
          </li>
        </ul>
      </InfoPanel>
      <InfoPanel
        label="02 / PROMISE"
        locale={locale}
        title={localized('一分の余白', 'One minute of room')}
      >
        <p>
          {resolveText(
            localized(
              '懐かしさは枠線、短文、静止画、選びやすい番号で表現する。古い不便さは持ち込まない。',
              'Nostalgia comes from borders, short text, still scenes, and clear numbered choices—not old friction.',
            ),
            locale,
          )}
        </p>
      </InfoPanel>
    </div>
  );
}

function TownContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <div className="content-grid">
      <InfoPanel
        label="DISPATCH / 01"
        locale={locale}
        title={localized('今日のDispatch', 'Today’s dispatch')}
      >
        <p>{resolveText(UI_FIXTURES.townNotices[0], locale)}</p>
        <div className="metric-row">
          <Metric
            label={localized('危険度', 'Risk')}
            locale={locale}
            value={localized('低', 'Low')}
          />
          <Metric
            label={localized('目安', 'Length')}
            locale={locale}
            value={localized('約1分', 'About 1 min')}
          />
        </div>
      </InfoPanel>
      <InfoPanel
        label="OPERATIONS / READ ONLY"
        locale={locale}
        title={localized('街の状態', 'Town state')}
      >
        <p>{resolveText(UI_FIXTURES.townNotices[1], locale)}</p>
        <StateBadge tone="steady" label={localized('操作可能', 'Operable')} locale={locale} />
      </InfoPanel>
    </div>
  );
}

function RoutesContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <section aria-labelledby="route-list-title" className="panel-stack">
      <div className="section-heading">
        <p className="eyebrow">ROUTE / FIXTURE DATA</p>
        <h2 id="route-list-title">
          {resolveText(localized('入口を選ぶ', 'Choose an entrance'), locale)}
        </h2>
      </div>
      <div className="route-list">
        {UI_FIXTURES.routes.map((route) => (
          <article className="route-card" key={route.name.ja}>
            <div>
              <h3>{resolveText(route.name, locale)}</h3>
              <p>{resolveText(route.detail, locale)}</p>
            </div>
            <div className="tag-row">
              <span className="tag">{resolveText(route.risk, locale)}</span>
              <span className="tag">{resolveText(route.time, locale)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExplorationContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <div className="content-grid">
      <InfoPanel
        label="EVENT / 01"
        locale={locale}
        title={localized('硝子沼の入口', 'Glass Marsh entrance')}
      >
        <p>
          {resolveText(
            localized(
              '硝子沼の水路で、三本の信号線が次の一手を示している。',
              'Three signal lines mark the next move in the Glass Marsh waterway.',
            ),
            locale,
          )}
        </p>
      </InfoPanel>
      <InfoPanel label="TELEGRAPH / STATIC" locale={locale} title={localized('予兆', 'Telegraph')}>
        <ol className="timeline-list">
          <li>{resolveText(localized('雨が強くなる', 'Rain intensifies'), locale)}</li>
          <li>{resolveText(localized('光が三本に分かれる', 'Light splits into three'), locale)}</li>
          <li>{resolveText(localized('遭遇を読む', 'Read the encounter'), locale)}</li>
        </ol>
      </InfoPanel>
    </div>
  );
}

function EncounterContent({
  locale,
  queuedCommands,
}: {
  locale: UiPreferences['locale'];
  queuedCommands: string[];
}) {
  const queuedLabels = queuedCommands.map((id) => {
    const labels: Record<string, LocalizedText> = {
      blade: localized('短剣で試す', 'Blade test'),
      guard: localized('身を守る', 'Guard'),
      observe: localized('観察する', 'Observe'),
    };
    return labels[id] ?? localized('未定義の命令', 'Unknown command');
  });

  return (
    <div className="content-grid">
      <InfoPanel
        label="TELEGRAPH / READABLE"
        locale={locale}
        title={localized('硝子沼の鐘守', 'Glass Marsh Bellkeeper')}
      >
        <p>
          {resolveText(
            localized(
              '相手の予兆を読み、最大3手の命令をキューへ並べます。',
              'Read the telegraph and queue up to three commands.',
            ),
            locale,
          )}
        </p>
        <StateBadge
          tone="warning"
          label={localized('命令待ち', 'Awaiting commands')}
          locale={locale}
        />
      </InfoPanel>
      <section aria-labelledby="queue-title" className="queue-panel">
        <p className="eyebrow">COMMAND QUEUE / {queuedLabels.length}/3</p>
        <h2 id="queue-title">{resolveText(localized('命令キュー', 'Command queue'), locale)}</h2>
        {queuedLabels.length > 0 ? (
          <ol className="queue-list">
            {queuedLabels.map((label, index) => (
              <li key={`${label.ja}-${index}`}>
                <span className="queue-number">{index + 1}</span>
                {resolveText(label, locale)}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted-copy">
            {resolveText(
              localized(
                'まだ命令はありません。下のコマンドから選べます。',
                'No commands yet. Choose from the commands below.',
              ),
              locale,
            )}
          </p>
        )}
      </section>
    </div>
  );
}

function ResultContent({
  locale,
  queuedCommands,
}: {
  locale: UiPreferences['locale'];
  queuedCommands: string[];
}) {
  return (
    <section aria-labelledby="combat-log-title" className="panel-stack">
      <div className="section-heading">
        <p className="eyebrow">COMBAT LOG / STATIC</p>
        <h2 id="combat-log-title">
          {resolveText(localized('順番を読む', 'Read the order'), locale)}
        </h2>
      </div>
      <ol className="log-list">
        {UI_FIXTURES.combatLog.map((entry) => (
          <li className={`log-entry log-entry--${entry.tone}`} key={entry.label.ja}>
            <div className="log-label">{resolveText(entry.label, locale)}</div>
            <p>{resolveText(entry.detail, locale)}</p>
          </li>
        ))}
      </ol>
      <StateBadge
        tone="good"
        label={localized(
          `${queuedCommands.length}手を記録しました`,
          `${queuedCommands.length} command(s) recorded`,
        )}
        locale={locale}
      />
    </section>
  );
}

function LootContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <InfoPanel label="LOOT / PROVENANCE" locale={locale} title={UI_FIXTURES.loot.name}>
      <p>{resolveText(UI_FIXTURES.loot.detail, locale)}</p>
      <dl className="detail-list">
        <div>
          <dt>{resolveText(localized('出所', 'Provenance'), locale)}</dt>
          <dd>{resolveText(UI_FIXTURES.loot.provenance, locale)}</dd>
        </div>
        <div>
          <dt>{resolveText(localized('状態', 'State'), locale)}</dt>
          <dd>{resolveText(localized('未受領fixture', 'Unclaimed fixture'), locale)}</dd>
        </div>
      </dl>
    </InfoPanel>
  );
}

function InventoryContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <section aria-labelledby="inventory-list-title" className="panel-stack">
      <div className="section-heading">
        <p className="eyebrow">PACK / READ ONLY</p>
        <h2 id="inventory-list-title">
          {resolveText(localized('装備と容量', 'Gear and capacity'), locale)}
        </h2>
      </div>
      <div
        className="capacity-meter"
        aria-label={resolveText(localized('容量 2 / 8', 'Capacity 2 / 8'), locale)}
      >
        <div className="capacity-meter__label">
          <span>{resolveText(localized('携行容量', 'Carry capacity'), locale)}</span>
          <strong>2 / 8</strong>
        </div>
        <div aria-hidden="true" className="capacity-meter__track">
          <span />
        </div>
      </div>
      <div className="inventory-list">
        {UI_FIXTURES.inventory.map((item) => (
          <article className="inventory-card" key={item.name.ja}>
            <div>
              <p className="eyebrow">{resolveText(item.slot, locale)}</p>
              <h3>{resolveText(item.name, locale)}</h3>
              <p>{resolveText(item.detail, locale)}</p>
            </div>
            <div className="inventory-card__meta">
              <span className="tag">{resolveText(item.rarity, locale)}</span>
              <strong>{item.value}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CodexContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <section aria-labelledby="codex-list-title" className="panel-stack">
      <div className="section-heading">
        <p className="eyebrow">CODEX / SEARCHABLE LATER</p>
        <h2 id="codex-list-title">
          {resolveText(localized('発見済みの記録', 'Discovered records'), locale)}
        </h2>
      </div>
      <label className="search-field">
        <span>{resolveText(localized('記録を検索する例', 'Example record search'), locale)}</span>
        <input
          aria-label={resolveText(localized('記録を検索', 'Search records'), locale)}
          placeholder="signal / 雨鐘"
          type="search"
        />
      </label>
      <div className="codex-list">
        {UI_FIXTURES.codexEntries.map((entry) => (
          <article className="codex-card" key={entry.name.ja}>
            <h3>{resolveText(entry.name, locale)}</h3>
            <p>{resolveText(entry.detail, locale)}</p>
          </article>
        ))}
      </div>
      <StatePanel
        label={localized('未発見の記録', 'Undiscovered record')}
        message={localized(
          'このページは空の状態として確認できます。',
          'This page is available as an empty-state example.',
        )}
        tone="empty"
        locale={locale}
      />
    </section>
  );
}

function SettingsContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <section aria-labelledby="settings-list-title" className="panel-stack">
      <div className="section-heading">
        <p className="eyebrow">PREFERENCES / LOCAL MODEL</p>
        <h2 id="settings-list-title">
          {resolveText(localized('表示設定', 'Display preferences'), locale)}
        </h2>
      </div>
      <div className="settings-list">
        <div className="setting-row">
          <div>
            <h3>{resolveText(localized('テーマ', 'Theme'), locale)}</h3>
            <p>
              {resolveText(
                localized(
                  '同じ意味構造の見た目を選ぶ',
                  'Choose a presentation for the same structure',
                ),
                locale,
              )}
            </p>
          </div>
          <span className="tag">Retro / Modern</span>
        </div>
        <div className="setting-row">
          <div>
            <h3>{resolveText(localized('密度', 'Density'), locale)}</h3>
            <p>
              {resolveText(
                localized(
                  '携帯の読みやすさとPCの一覧性を調整',
                  'Balance phone readability and desktop scanability',
                ),
                locale,
              )}
            </p>
          </div>
          <span className="tag">Local v1</span>
        </div>
      </div>
      <div className="form-grid">
        <label className="form-field">
          <span>{resolveText(localized('表示言語', 'Display language'), locale)}</span>
          <select
            aria-label={resolveText(localized('表示言語', 'Display language'), locale)}
            disabled
            value="ja"
            onChange={() => undefined}
          >
            <option value="ja">日本語 / Japanese</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="form-field">
          <span>
            {resolveText(localized('表示名のプレビュー', 'Display name preview'), locale)}
          </span>
          <input
            aria-label={resolveText(
              localized('表示名のプレビュー', 'Display name preview'),
              locale,
            )}
            defaultValue="Lattice-guest"
            type="text"
          />
        </label>
      </div>
      <StatePanel
        label={localized('一般向け表示', 'General presentation')}
        message={localized(
          'Suggestive presentationはfeature flag OFF。設定から有効化できません。',
          'Suggestive presentation is OFF and cannot be enabled from settings.',
        )}
        tone="steady"
        locale={locale}
      />
    </section>
  );
}

function MaintenanceContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <div className="content-grid">
      <StatePanel
        label={localized('読み取り専用', 'Read only')}
        message={localized(
          '保守中も現在地、記録、戻る操作は利用できます。mutationはありません。',
          'Location, records, and navigation remain available during maintenance. There are no mutations.',
        )}
        tone="warning"
        locale={locale}
      />
      <InfoPanel
        label="CAPACITY / SAFE"
        locale={locale}
        title={localized('容量ガード', 'Capacity guard')}
      >
        <p>
          {resolveText(
            localized(
              'このfixtureは低コストの静的画面です。高負荷時は新しい操作を受け付けず、案内だけを表示します。',
              'This fixture is a low-cost static screen. Under load it accepts no new operation and shows guidance only.',
            ),
            locale,
          )}
        </p>
      </InfoPanel>
    </div>
  );
}

function EmptyContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <StatePanel
      label={localized('空の状態', 'Empty state')}
      message={localized(
        'まだ発見はありません。街へ戻るか、記録庫の既知ページを読みます。',
        'Nothing has been discovered yet. Return to town or read known codex pages.',
      )}
      tone="empty"
      locale={locale}
    />
  );
}

function ErrorContent({ locale }: { locale: UiPreferences['locale'] }) {
  return (
    <StatePanel
      label={localized('復帰可能なエラー', 'Recoverable error')}
      message={localized(
        'fixtureの信号を取得できませんでした。再送信せず、保守案内または街へ戻れます。',
        'The fixture signal could not be read. No retry is sent; return to operations or town.',
      )}
      tone="error"
      locale={locale}
    />
  );
}

function CommandPanel({
  commands,
  locale,
  onCommand,
}: {
  commands: ScreenCommand[];
  locale: UiPreferences['locale'];
  onCommand: (action: CommandAction) => void;
}) {
  return (
    <section aria-labelledby="command-panel-title" className="command-panel">
      <div className="command-panel__heading">
        <p className="eyebrow">COMMANDS / KEYBOARD + TOUCH</p>
        <h2 id="command-panel-title">
          {resolveText(localized('次の操作', 'Next actions'), locale)}
        </h2>
      </div>
      <ol className="command-list">
        {commands.map((commandItem) => {
          const commandId = `command-${commandItem.key}`;
          return (
            <li key={commandItem.key}>
              <button
                aria-describedby={`${commandId}-description`}
                aria-keyshortcuts={commandItem.key === '0' ? '0 Escape' : commandItem.key}
                className="command-button"
                data-command-key={commandItem.key}
                disabled={commandItem.disabled}
                type="button"
                onClick={() => onCommand(commandItem.action)}
              >
                <span aria-hidden="true" className="command-key">
                  {commandItem.key}
                </span>
                <span className="command-copy">
                  <strong>{resolveText(commandItem.label, locale)}</strong>
                  <span id={`${commandId}-description`}>
                    {resolveText(commandItem.description, locale)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="keyboard-note">
        {resolveText(
          localized(
            'キーボード: 1〜9で選択 / 0またはEscapeで戻る。入力欄では発火しません。',
            'Keyboard: 1–9 select / 0 or Escape back. Shortcuts pause in fields.',
          ),
          locale,
        )}
      </p>
    </section>
  );
}

function InfoPanel({
  children,
  label,
  locale,
  title,
}: {
  children: ReactNode;
  label: string;
  locale: UiPreferences['locale'];
  title: LocalizedText;
}) {
  return (
    <article className="info-panel">
      <p className="eyebrow">{label}</p>
      <h2>{resolveText(title, locale)}</h2>
      {children}
    </article>
  );
}

function Metric({
  label,
  locale,
  value,
}: {
  label: LocalizedText;
  locale: UiPreferences['locale'];
  value: LocalizedText;
}) {
  return (
    <div className="metric">
      <span>{resolveText(label, locale)}</span>
      <strong>{resolveText(value, locale)}</strong>
    </div>
  );
}

function StateBadge({
  label,
  locale,
  tone,
}: {
  label: LocalizedText;
  locale: UiPreferences['locale'];
  tone: 'good' | 'steady' | 'warning';
}) {
  return (
    <span className={`state-badge state-badge--${tone}`}>
      <span aria-hidden="true">{tone === 'good' ? '✓' : tone === 'warning' ? '!' : '•'}</span>
      {resolveText(label, locale)}
    </span>
  );
}

function StatePanel({
  label,
  locale,
  message,
  tone,
}: {
  label: LocalizedText;
  locale: UiPreferences['locale'];
  message: LocalizedText;
  tone: 'empty' | 'error' | 'steady' | 'warning';
}) {
  const role = tone === 'error' ? 'alert' : 'status';
  return (
    <section aria-live="polite" className={`state-panel state-panel--${tone}`} role={role}>
      <p className="eyebrow">STATE / {tone.toUpperCase()}</p>
      <h2>{resolveText(label, locale)}</h2>
      <p>{resolveText(message, locale)}</p>
      <StateBadge
        label={label}
        locale={locale}
        tone={tone === 'error' || tone === 'empty' ? 'warning' : tone}
      />
    </section>
  );
}
