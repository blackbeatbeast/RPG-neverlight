export type Locale = 'ja' | 'en';
export type ThemeMode = 'retro' | 'modern';
export type DensityMode = 'compact' | 'comfortable';
export type PresentationMode = 'general';

export interface LocalizedText {
  en: string;
  ja: string;
}

export function localized(ja: string, en: string = ja): LocalizedText {
  return { en, ja };
}

export function resolveText(value: LocalizedText, locale: Locale): string {
  return value[locale] ?? value.ja;
}

export interface UiPreferences {
  density: DensityMode;
  locale: Locale;
  presentation: PresentationMode;
  schemaVersion: 1;
  theme: ThemeMode;
}

export const DEFAULT_PREFERENCES: UiPreferences = {
  density: 'comfortable',
  locale: 'ja',
  presentation: 'general',
  schemaVersion: 1,
  theme: 'retro',
};

export const PREFERENCES_STORAGE_KEY = 'neverlight.ui-preferences.v1';

export type ScreenId =
  | 'codex'
  | 'empty'
  | 'encounter'
  | 'error'
  | 'exploration'
  | 'inventory'
  | 'landing'
  | 'loot'
  | 'maintenance'
  | 'result'
  | 'routes'
  | 'settings'
  | 'town';

export interface ScreenDefinition {
  description: LocalizedText;
  eyebrow: LocalizedText;
  title: LocalizedText;
}

export const SCREEN_DEFINITIONS: Record<ScreenId, ScreenDefinition> = {
  codex: {
    description: localized(
      '発見した記録と、まだ空白のページを読む。',
      'Read found records and the pages still waiting.',
    ),
    eyebrow: localized('記録庫 / CODEX', 'ARCHIVE / CODEX'),
    title: localized('記録庫', 'Codex'),
  },
  empty: {
    description: localized(
      'まだ記録されていない場所を、静かに案内する。',
      'A quiet stop for places not recorded yet.',
    ),
    eyebrow: localized('空の状態 / EMPTY', 'EMPTY STATE'),
    title: localized('まだ空白のページ', 'An empty page'),
  },
  encounter: {
    description: localized(
      '3手までの命令を並べ、結果を先に読む。',
      'Queue up to three commands and read the outcome.',
    ),
    eyebrow: localized('遭遇 / ENCOUNTER', 'ENCOUNTER'),
    title: localized('硝子沼の鐘守', 'The Glass Marsh Bellkeeper'),
  },
  error: {
    description: localized(
      '原因を隠さず、戻れる選択肢を残す。',
      'Name the problem and keep a safe way back.',
    ),
    eyebrow: localized('エラー状態 / ERROR', 'ERROR STATE'),
    title: localized('信号を読み込めない', 'Signal unavailable'),
  },
  exploration: {
    description: localized(
      '静止画と短文で、次の一歩を選ぶ。',
      'Choose the next step through still art and short text.',
    ),
    eyebrow: localized('探索 / EXPLORATION', 'EXPLORATION'),
    title: localized('硝子沼の水路', 'Glass Marsh Waterway'),
  },
  inventory: {
    description: localized(
      '装備の由来と、容量の余白を比べる。',
      'Compare provenance and the space left in your pack.',
    ),
    eyebrow: localized('持ち物 / INVENTORY', 'INVENTORY'),
    title: localized('携行品', 'Inventory'),
  },
  landing: {
    description: localized(
      '短い操作で、Vesper Arkの今日を開く。',
      'Open a short session in Vesper Ark.',
    ),
    eyebrow: localized('入口 / LANDING', 'ENTRY / LANDING'),
    title: localized('Vesper Arkへようこそ', 'Welcome to Vesper Ark'),
  },
  loot: {
    description: localized(
      '拾ったものを読み、次の使い道を決める。',
      'Read what survived and choose what comes next.',
    ),
    eyebrow: localized('戦利品 / LOOT', 'LOOT'),
    title: localized('鐘守の余音刃', 'Bellkeeper Aftertone Blade'),
  },
  maintenance: {
    description: localized(
      '読み取り専用でも、現在地と出口は見える。',
      'Even read-only, your place and exit stay visible.',
    ),
    eyebrow: localized('運用状態 / MAINTENANCE', 'OPERATIONS / MAINTENANCE'),
    title: localized('静かな保守時間', 'Quiet maintenance'),
  },
  result: {
    description: localized(
      '命令の順番と、変化した状態を静的ログで確認する。',
      'Review command order and state changes in a static log.',
    ),
    eyebrow: localized('結果 / COMBAT LOG', 'RESULT / COMBAT LOG'),
    title: localized('遭遇の記録', 'Encounter record'),
  },
  routes: {
    description: localized(
      '危険度と滞在時間を読んで、探索口を選ぶ。',
      'Read risk and session length before choosing an entrance.',
    ),
    eyebrow: localized('道標 / ROUTE SELECT', 'WAYFINDING / ROUTE SELECT'),
    title: localized('次の道を選ぶ', 'Choose a route'),
  },
  settings: {
    description: localized(
      '表示密度、テーマ、読み上げに配慮した選択を保存する。',
      'Save display preferences built for reading and assistive use.',
    ),
    eyebrow: localized('設定 / SETTINGS', 'SETTINGS'),
    title: localized('読み方を選ぶ', 'Choose how to read'),
  },
  town: {
    description: localized(
      'Dispatch、持ち物、記録庫へ戻れる小さな広場。',
      'A small square that leads to dispatch, gear, and records.',
    ),
    eyebrow: localized('街 / TOWN', 'TOWN'),
    title: localized('雨鐘街・外縁', 'Rainbell Quay'),
  },
};

export type CommandAction =
  | { type: 'back' }
  | { type: 'navigate'; target: ScreenId }
  | { commandId: string; label: LocalizedText; type: 'queue' }
  | { type: 'resolve' }
  | { type: 'toggle-density' }
  | { type: 'toggle-theme' };

export interface ScreenCommand {
  action: CommandAction;
  description: LocalizedText;
  disabled?: boolean;
  key: string;
  label: LocalizedText;
}

function command(
  key: string,
  label: LocalizedText,
  description: LocalizedText,
  action: CommandAction,
  disabled = false,
): ScreenCommand {
  return { action, description, disabled, key, label };
}

const backCommand = command(
  '0',
  localized('戻る', 'Back'),
  localized('前の画面へ戻る', 'Return to the previous screen'),
  { type: 'back' },
);

function navigate(
  target: ScreenId,
  label: LocalizedText,
  description: LocalizedText,
): ScreenCommand {
  return command('1', label, description, { target, type: 'navigate' });
}

export function getCommandsForScreen(
  screen: ScreenId,
  queuedCount: number,
  preferences: UiPreferences,
): ScreenCommand[] {
  switch (screen) {
    case 'landing':
      return [
        navigate(
          'town',
          localized('ゲームを始める', 'Start a session'),
          localized('雨鐘街・外縁へ進む', 'Enter Rainbell Quay'),
        ),
        command(
          '2',
          localized('設定を読む', 'Read settings'),
          localized('テーマと密度を選ぶ', 'Choose theme and density'),
          { target: 'settings', type: 'navigate' },
        ),
        command(
          '3',
          localized('運用状態を見る', 'View operations'),
          localized('保守と読み取り専用の案内', 'Maintenance and read-only information'),
          { target: 'maintenance', type: 'navigate' },
        ),
      ];
    case 'town':
      return [
        navigate(
          'routes',
          localized('探索へ', 'Explore'),
          localized('探索入口を選ぶ', 'Choose an exploration entrance'),
        ),
        command(
          '2',
          localized('持ち物を見る', 'Open inventory'),
          localized('装備と容量を確認する', 'Check equipment and capacity'),
          { target: 'inventory', type: 'navigate' },
        ),
        command(
          '3',
          localized('記録庫を開く', 'Open codex'),
          localized('発見した記録を読む', 'Read discovered records'),
          { target: 'codex', type: 'navigate' },
        ),
        command(
          '4',
          localized('設定を開く', 'Open settings'),
          localized('テーマと密度を選ぶ', 'Choose theme and density'),
          { target: 'settings', type: 'navigate' },
        ),
        command(
          '5',
          localized('運用状態を見る', 'View operations'),
          localized('読み取り専用と保守の案内', 'Read-only and maintenance information'),
          { target: 'maintenance', type: 'navigate' },
        ),
        command(
          '6',
          localized('空の状態を見る', 'View empty state'),
          localized('未発見の記録を確認する', 'Review an undiscovered record state'),
          { target: 'empty', type: 'navigate' },
        ),
        command(
          '7',
          localized('エラー状態を見る', 'View error state'),
          localized('安全な復帰方法を確認する', 'Review the safe recovery path'),
          { target: 'error', type: 'navigate' },
        ),
      ];
    case 'routes':
      return [
        navigate(
          'exploration',
          localized('硝子沼を探索', 'Explore Glass Marsh'),
          localized('短い探索を開始する', 'Start a short exploration'),
        ),
        command(
          '2',
          localized('街へ戻る', 'Return to town'),
          localized('探索を開始せずに戻る', 'Leave without starting'),
          { target: 'town', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'exploration':
      return [
        navigate(
          'encounter',
          localized('信号を調べる', 'Inspect signal'),
          localized('遭遇の命令選択へ進む', 'Continue to encounter commands'),
        ),
        command(
          '2',
          localized('街へ戻る', 'Return to town'),
          localized('探索を終えて戻る', 'End the exploration'),
          { target: 'town', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'encounter':
      return [
        command(
          '1',
          localized('短剣で試す', 'Test with a blade'),
          localized('安定した1手を予約する', 'Queue a steady action'),
          { commandId: 'blade', label: localized('短剣で試す', 'Blade test'), type: 'queue' },
          queuedCount >= 3,
        ),
        command(
          '2',
          localized('身を守る', 'Guard'),
          localized('次の被害を抑える1手を予約する', 'Queue a defensive action'),
          { commandId: 'guard', label: localized('身を守る', 'Guard'), type: 'queue' },
          queuedCount >= 3,
        ),
        command(
          '3',
          localized('観察する', 'Observe'),
          localized('相手の予兆を読む1手を予約する', 'Queue a telegraph-reading action'),
          { commandId: 'observe', label: localized('観察する', 'Observe'), type: 'queue' },
          queuedCount >= 3,
        ),
        command(
          '4',
          localized('結果を確認する', 'Review result'),
          localized('予約した命令を静的ログで確認する', 'Review queued commands in a static log'),
          { type: 'resolve' },
          queuedCount === 0,
        ),
        backCommand,
      ];
    case 'result':
      return [
        navigate(
          'loot',
          localized('戦利品を読む', 'Inspect loot'),
          localized('残った部品の由来を確認する', 'Review the surviving component'),
        ),
        command(
          '2',
          localized('持ち物へ', 'Open inventory'),
          localized('装備と容量を見る', 'View equipment and capacity'),
          { target: 'inventory', type: 'navigate' },
        ),
        command(
          '3',
          localized('街へ戻る', 'Return to town'),
          localized('結果を閉じる', 'Close the result'),
          { target: 'town', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'loot':
      return [
        navigate(
          'inventory',
          localized('持ち物に記録', 'Record in inventory'),
          localized('読み取り専用のfixtureとして確認する', 'Review as a read-only fixture'),
        ),
        command(
          '2',
          localized('街へ戻る', 'Return to town'),
          localized('戦利品を閉じる', 'Close the loot card'),
          { target: 'town', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'inventory':
      return [
        navigate(
          'codex',
          localized('記録庫へ', 'Open codex'),
          localized('アイテムの由来を読む', 'Read item provenance'),
        ),
        command(
          '2',
          localized('街へ戻る', 'Return to town'),
          localized('持ち物を閉じる', 'Close inventory'),
          { target: 'town', type: 'navigate' },
        ),
        command(
          '3',
          localized('設定へ', 'Open settings'),
          localized('テーマと密度を調整する', 'Adjust theme and density'),
          { target: 'settings', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'codex':
      return [
        navigate(
          'inventory',
          localized('持ち物へ', 'Open inventory'),
          localized('記録したアイテムを確認する', 'Review recorded items'),
        ),
        command(
          '2',
          localized('街へ戻る', 'Return to town'),
          localized('記録庫を閉じる', 'Close codex'),
          { target: 'town', type: 'navigate' },
        ),
        command(
          '3',
          localized('空白ページを見る', 'View empty page'),
          localized('未発見の状態を確認する', 'Review an undiscovered state'),
          { target: 'empty', type: 'navigate' },
        ),
        command(
          '4',
          localized('設定へ', 'Open settings'),
          localized('テーマと密度を調整する', 'Adjust theme and density'),
          { target: 'settings', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'settings':
      return [
        command(
          '1',
          preferences.theme === 'retro'
            ? localized('Modernへ切替', 'Switch to modern')
            : localized('Retroへ切替', 'Switch to retro'),
          localized(
            '同じ情報構造のテーマを切り替える',
            'Switch the theme without changing information',
          ),
          { type: 'toggle-theme' },
        ),
        command(
          '2',
          preferences.density === 'compact'
            ? localized('余白を増やす', 'Use comfortable spacing')
            : localized('密度を上げる', 'Use compact spacing'),
          localized('読みやすさのための密度を切り替える', 'Switch readable layout density'),
          { type: 'toggle-density' },
        ),
        command(
          '3',
          localized('街へ戻る', 'Return to town'),
          localized('設定を保存して戻る', 'Save preferences and return'),
          { target: 'town', type: 'navigate' },
        ),
        command(
          '4',
          localized('保守案内を見る', 'View maintenance'),
          localized('読み取り専用状態の説明', 'Read the read-only explanation'),
          { target: 'maintenance', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'maintenance':
      return [
        navigate(
          'town',
          localized('街へ戻る', 'Return to town'),
          localized('読み取り専用の案内を閉じる', 'Close the read-only notice'),
        ),
        command(
          '2',
          localized('エラー状態を見る', 'View error state'),
          localized('復帰できるエラー表示を確認する', 'Review the recoverable error display'),
          { target: 'error', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'empty':
      return [
        navigate(
          'codex',
          localized('記録庫へ戻る', 'Return to codex'),
          localized('発見済みの記録を読む', 'Read discovered records'),
        ),
        command(
          '2',
          localized('街へ戻る', 'Return to town'),
          localized('空の状態を閉じる', 'Close the empty state'),
          { target: 'town', type: 'navigate' },
        ),
        backCommand,
      ];
    case 'error':
      return [
        navigate(
          'maintenance',
          localized('運用案内へ', 'Open operations'),
          localized('読み取り専用の復帰案内を読む', 'Read the read-only recovery path'),
        ),
        command(
          '2',
          localized('街へ戻る', 'Return to town'),
          localized('エラーを閉じる', 'Close the error'),
          { target: 'town', type: 'navigate' },
        ),
        backCommand,
      ];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDensity(value: unknown): value is DensityMode {
  return value === 'compact' || value === 'comfortable';
}

function isLocale(value: unknown): value is Locale {
  return value === 'ja' || value === 'en';
}

function isTheme(value: unknown): value is ThemeMode {
  return value === 'retro' || value === 'modern';
}

export function loadPreferences(serialized: string | null): UiPreferences {
  if (!serialized) return { ...DEFAULT_PREFERENCES };

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)) return { ...DEFAULT_PREFERENCES };

    return {
      density: isDensity(parsed.density) ? parsed.density : DEFAULT_PREFERENCES.density,
      locale: isLocale(parsed.locale) ? parsed.locale : DEFAULT_PREFERENCES.locale,
      presentation: 'general',
      schemaVersion: 1,
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_PREFERENCES.theme,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function serializePreferences(preferences: UiPreferences): string {
  return JSON.stringify(preferences);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;

  const candidate = target as { isContentEditable?: boolean; tagName?: string };
  const tagName = candidate.tagName?.toLowerCase();
  return (
    candidate.isContentEditable === true ||
    tagName === 'input' ||
    tagName === 'select' ||
    tagName === 'textarea'
  );
}

export function getCommandForKey(
  commands: ScreenCommand[],
  key: string,
): ScreenCommand | undefined {
  const normalizedKey = key === 'Escape' ? '0' : key;
  return commands.find((commandItem) => commandItem.key === normalizedKey);
}
