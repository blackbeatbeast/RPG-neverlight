import { localized, type LocalizedText } from './app-model.js';

export interface SceneFixture {
  alt: LocalizedText;
  caption: LocalizedText;
  id: string;
  motif: string;
}

export interface RouteFixture {
  detail: LocalizedText;
  name: LocalizedText;
  risk: LocalizedText;
  time: LocalizedText;
}

export interface InventoryFixture {
  detail: LocalizedText;
  name: LocalizedText;
  rarity: LocalizedText;
  slot: LocalizedText;
  value: string;
}

export interface LogFixture {
  detail: LocalizedText;
  label: LocalizedText;
  tone: 'calm' | 'danger' | 'good';
}

export const UI_FIXTURES = {
  codexEntries: [
    {
      detail: localized(
        '雨鐘街の地下に残る、断続的な信号の写し。',
        'A copy of an intermittent signal beneath Rainbell Square.',
      ),
      name: localized('雨鐘信号 / 01', 'Rainbell signal / 01'),
    },
    {
      detail: localized(
        '誰かが拾い、誰かが書き足すための余白。',
        'A margin left for someone to find and continue.',
      ),
      name: localized('余白の規則', 'Rule of the margin'),
    },
  ],
  combatLog: [
    {
      detail: localized(
        '短剣の軌道が予兆の中心を外し、敵の観察値が下がった。',
        'The blade missed the telegraph center and lowered the enemy readout.',
      ),
      label: localized('01 / 短剣で試す', '01 / Blade test'),
      tone: 'good' as const,
    },
    {
      detail: localized(
        '信号の獣は動きを止め、次の一手を準備している。',
        'The Signal Beast pauses and prepares its next move.',
      ),
      label: localized('02 / 予兆', '02 / Telegraph'),
      tone: 'danger' as const,
    },
    {
      detail: localized(
        '命令ログは静的に保存される。再生は次のPacketで扱う。',
        'The command log is static; replay belongs to a later packet.',
      ),
      label: localized('03 / 記録', '03 / Record'),
      tone: 'calm' as const,
    },
  ],
  inventory: [
    {
      detail: localized('雨に濡れても文字だけは消えない。', 'The lettering survives the rain.'),
      name: localized('雨読の短剣', 'Rain-read blade'),
      rarity: localized('珍しい', 'Uncommon'),
      slot: localized('右手', 'Right hand'),
      value: '+3 読解 / +1 近接',
    },
    {
      detail: localized(
        '街の修理台で何度も見かける留め具。',
        'A fastener often seen on the town repair bench.',
      ),
      name: localized('予備の留め具', 'Spare fastener'),
      rarity: localized('一般', 'Common'),
      slot: localized('部品', 'Component'),
      value: '+1 修理',
    },
  ] satisfies InventoryFixture[],
  loot: {
    detail: localized(
      '壊れた信号機の内側で、まだ温度を持っていた。',
      'It still held warmth inside a broken signal box.',
    ),
    name: localized('残響する部品', 'Echoing component'),
    provenance: localized(
      '雨の送電塔 / fixture encounter / 2026-08-20',
      'Rain Tower / fixture encounter / 2026-08-20',
    ),
  },
  routes: [
    {
      detail: localized(
        '短い遭遇と、読み取りやすい予兆がある。',
        'A short encounter with readable telegraphs.',
      ),
      name: localized('雨の送電塔', 'Rain Tower'),
      risk: localized('低', 'Low'),
      time: localized('約1分', 'About 1 min'),
    },
    {
      detail: localized(
        '信号が重なる。結果ログを読む余裕を残す。',
        'Signals overlap; leave room to read the result log.',
      ),
      name: localized('地下の余白', 'Underground margin'),
      risk: localized('中', 'Medium'),
      time: localized('約5分', 'About 5 min'),
    },
  ] satisfies RouteFixture[],
  scenes: {
    encounter: {
      alt: localized(
        '霧の中で三本の光が交差する抽象画。',
        'An abstract scene of three lights crossing in fog.',
      ),
      caption: localized(
        '予兆を読む / 画像なしでも命令は選べます',
        'Read the telegraph / commands work without the image',
      ),
      id: 'encounter',
      motif: 'signal',
    },
    landing: {
      alt: localized(
        '雨の向こうに小さな入口灯が浮かぶ抽象画。',
        'An abstract scene of a small entrance light beyond rain.',
      ),
      caption: localized(
        '静止画の入口 / まず短いページを開く',
        'Still-image entry / open a short page first',
      ),
      id: 'landing',
      motif: 'portal',
    },
    result: {
      alt: localized(
        '紙片と青い信号線が机の上に並ぶ抽象画。',
        'An abstract scene of paper slips and blue signal lines on a desk.',
      ),
      caption: localized(
        '命令ログ / 順番と変化を文字で確認',
        'Command log / read order and changes as text',
      ),
      id: 'result',
      motif: 'log',
    },
    town: {
      alt: localized(
        '雨鐘街の広場を表す灯りと枠線の抽象画。',
        'An abstract scene of lights and borders for Rainbell Square.',
      ),
      caption: localized(
        '雨鐘街 / 次の操作を番号で選ぶ',
        'Rainbell Square / choose the next action by number',
      ),
      id: 'town',
      motif: 'town',
    },
  } satisfies Record<string, SceneFixture>,
  townNotices: [
    localized(
      '本日のDispatchは1件。読み取り専用のfixtureです。',
      'One dispatch today. This is a read-only fixture.',
    ),
    localized(
      '接続: local / 画像: 任意 / 音声: なし',
      'Connection: local / Images: optional / Audio: none',
    ),
  ],
} as const;
