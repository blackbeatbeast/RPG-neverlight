import { useEffect, useMemo, useState } from 'react';

import './styles.css';

type Rarity = 'common' | 'uncommon' | 'rare' | 'unique' | 'relic';
type ItemLocation = 'inventory' | 'vault' | 'equipment';

interface ItemAffix {
  id: string;
  name: string;
  stat: string;
  tier: number;
  value: number;
}

interface Item {
  affixes: ItemAffix[];
  baseId: string;
  baseStats: Record<string, number>;
  bindState: string;
  equipmentSlot: string | null;
  favorite: boolean;
  id: string;
  itemLevel: number;
  location: ItemLocation;
  locked: boolean;
  provenance: {
    contentVersion: string;
    rulesetVersion: string;
    seedHash: string;
    sourceRef: string;
  };
  quality: number;
  rarity: Rarity;
  slot: string;
  status: 'active' | 'salvaged';
  uniqueRule: string | null;
}

interface Inventory {
  capacity: number;
  codex: Array<{
    discoveryCount: number;
    entryId: string;
    entryType: string;
    firstSeenAt: string;
  }>;
  derivedStats: {
    armor: number;
    attack: number;
    explanations: Array<{ itemId: string; itemName: string; stats: Record<string, number> }>;
    focus: number;
    guard: number;
    luck: number;
    maxFocus: number;
    maxVitality: number;
    speed: number;
    vitality: number;
    ward: number;
  };
  items: Item[];
  materials: Record<string, number>;
  playerVersion: number;
}

interface ApiError {
  error?: { message?: string };
}

interface InventoryResponse {
  inventory: Inventory;
  ledgerEventIds?: string[];
  replayed?: boolean;
}

type SortMode = 'recent' | 'rarity' | 'power' | 'name';
type FilterMode = 'all' | Rarity;

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'unique', 'relic'];

function csrfToken(): string {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('neverlight_csrf='));
  return entry ? decodeURIComponent(entry.slice('neverlight_csrf='.length)) : '';
}

function keyFor(action: string): string {
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? 0}`;
  return `inventory-${action}-${suffix}`;
}

function itemPower(item: Item): number {
  return (
    Object.values(item.baseStats).reduce((total, value) => total + value, 0) +
    item.affixes.reduce((total, affix) => total + affix.value, 0)
  );
}

function itemName(item: Item): string {
  return item.baseId.replace('item.', '').replaceAll('-', ' ');
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function getInventory(): Promise<Inventory | null> {
  const response = await fetch('/api/v1/inventory', { credentials: 'include' });
  const body = await readJson<InventoryResponse & ApiError>(response);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(body.error?.message ?? '持ち物を読み込めません。');
  return body.inventory;
}

async function postJson<T extends InventoryResponse>(
  path: string,
  body: Record<string, unknown>,
  action: string,
): Promise<T> {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': keyFor(action),
      'X-CSRF-Token': csrfToken(),
    },
    method: 'POST',
  });
  const value = await readJson<T & ApiError>(response);
  if (!response.ok) throw new Error(value.error?.message ?? '持ち物操作に失敗しました。');
  return value;
}

export function InventorySliceApp() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<{ confirm: boolean; unlock: boolean } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    void getInventory()
      .then((current) => {
        if (active && current) setInventory(current);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : '持ち物を再開できません。');
      });
    return () => {
      active = false;
    };
  }, []);

  async function refresh(): Promise<void> {
    const current = await getInventory();
    if (current) setInventory(current);
  }

  async function startSession(): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/guest/start', {
        credentials: 'include',
        method: 'POST',
      });
      if (!response.ok) {
        const body = await readJson<ApiError>(response);
        throw new Error(body.error?.message ?? 'ゲストセッションを開始できません。');
      }
      await refresh();
      setMessage('ゲストセッションを開始しました。ドロップ源はサーバーが選びます。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ゲストセッションを開始できません。');
    } finally {
      setBusy(false);
    }
  }

  async function claim(sourceRef: 'rain-tower.boss' | 'rain-tower.cache'): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      const result = await postJson<InventoryResponse>(
        '/api/v1/inventory/loot/claim',
        { sourceRef },
        'loot',
      );
      setInventory(result.inventory);
      setMessage(
        result.replayed
          ? '同じ取得要求でした。保存済みのドロップを表示しています。'
          : `${sourceRef}からサーバーがアイテムをmintしました。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ドロップを取得できません。');
    } finally {
      setBusy(false);
    }
  }

  async function mark(item: Item): Promise<void> {
    if (!inventory) return;
    setBusy(true);
    try {
      const result = await postJson<InventoryResponse>(
        '/api/v1/inventory/mark',
        {
          expectedVersion: inventory.playerVersion,
          favorite: !item.favorite,
          itemId: item.id,
          locked: item.locked,
        },
        'mark',
      );
      setInventory(result.inventory);
      setMessage(item.favorite ? 'favoriteを外しました。' : 'favoriteを付けました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保護設定を変更できません。');
    } finally {
      setBusy(false);
    }
  }

  async function toggleLock(item: Item): Promise<void> {
    if (!inventory) return;
    setBusy(true);
    try {
      const result = await postJson<InventoryResponse>(
        '/api/v1/inventory/mark',
        {
          expectedVersion: inventory.playerVersion,
          favorite: item.favorite,
          itemId: item.id,
          locked: !item.locked,
        },
        'lock',
      );
      setInventory(result.inventory);
      setMessage(item.locked ? 'ロックを外しました。' : 'ロックしました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ロック設定を変更できません。');
    } finally {
      setBusy(false);
    }
  }

  async function equip(item: Item): Promise<void> {
    if (!inventory) return;
    setBusy(true);
    try {
      const mode = item.location === 'equipment' ? 'unequip' : 'equip';
      const result = await postJson<InventoryResponse>(
        '/api/v1/inventory/equip',
        { expectedVersion: inventory.playerVersion, itemId: item.id, mode },
        'equip',
      );
      setInventory(result.inventory);
      setMessage(
        mode === 'equip'
          ? '装備を更新しました。derived statsはサーバー計算です。'
          : '装備を外しました。',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '装備を変更できません。');
    } finally {
      setBusy(false);
    }
  }

  async function salvage(confirm: boolean, unlock: boolean): Promise<void> {
    if (!inventory || selectedIds.size === 0) return;
    setBusy(true);
    try {
      const result = await postJson<InventoryResponse>(
        '/api/v1/inventory/salvage',
        {
          confirm,
          expectedVersion: inventory.playerVersion,
          itemIds: [...selectedIds],
          unlock,
        },
        'salvage',
      );
      setInventory(result.inventory);
      setSelectedIds(new Set());
      setConfirmation(null);
      setMessage('分解をledgerへ記録し、Scrapを付与しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '分解できません。');
    } finally {
      setBusy(false);
    }
  }

  function requestSalvage(): void {
    if (!inventory || selectedIds.size === 0) return;
    const chosen = inventory.items.filter(
      (item) => selectedIds.has(item.id) && item.status === 'active',
    );
    const needsConfirm = chosen.some(
      (item) => ['rare', 'unique', 'relic'].includes(item.rarity) || item.locked || item.favorite,
    );
    if (needsConfirm)
      setConfirmation({
        confirm: true,
        unlock: chosen.some((item) => item.locked || item.favorite),
      });
    else void salvage(false, false);
  }

  const visibleItems = useMemo(() => {
    if (!inventory) return [];
    const active = inventory.items.filter((item) => item.status === 'active');
    const filtered = filter === 'all' ? active : active.filter((item) => item.rarity === filter);
    return [...filtered].sort((left, right) => {
      if (sort === 'rarity')
        return RARITY_ORDER.indexOf(right.rarity) - RARITY_ORDER.indexOf(left.rarity);
      if (sort === 'power') return itemPower(right) - itemPower(left);
      if (sort === 'name') return itemName(left).localeCompare(itemName(right));
      return right.id.localeCompare(left.id);
    });
  }, [filter, inventory, sort]);

  const activeCount = inventory?.items.filter((item) => item.status === 'active').length ?? 0;

  return (
    <div
      className="app-root"
      data-density="comfortable"
      data-theme="retro"
      data-testid="inventory-slice"
    >
      <a className="skip-link" href="#inventory-main">
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
                <span className="brand-name">Vesper Ark / LOOT</span>
              </span>
            </span>
          </div>
          <div className="header-meta" aria-label="持ち物の状態">
            <span className="meta-stamp">SERVER</span>
            <span>LEDGER / CODex</span>
            <span>JA / KEY SAFE</span>
          </div>
        </header>

        <div className="status-strip" role="status" aria-label="運用状態">
          <span className="status-item status-item--steady">
            <span aria-hidden="true">●</span> server-minted
          </span>
          <span className="status-item">
            <span aria-hidden="true">▣</span> retry-safe ledger
          </span>
          <span className="status-item">
            <span aria-hidden="true">◌</span> no paid power
          </span>
        </div>

        <div className="main-layout">
          <main className="page-shell" id="inventory-main" tabIndex={-1}>
            <header className="page-heading">
              <p className="eyebrow">LOOT / INVENTORY / CODEX</p>
              <h1 id="page-title">持ち物と記録庫</h1>
              <p className="page-description">
                アイテムの由来・保護状態・derived
                statsを読み、装備・保管・分解を選びます。seedと最終結果はブラウザから送信しません。
              </p>
            </header>

            {!inventory ? (
              <section className="content-grid">
                <article className="info-panel">
                  <p className="eyebrow">START / GUEST</p>
                  <h2>安全な持ち物を開く</h2>
                  <p>ゲストセッションを作成し、server-mintedなドロップの受け取りを開始します。</p>
                  <button
                    className="command-button vertical-primary"
                    disabled={busy}
                    type="button"
                    onClick={() => void startSession()}
                  >
                    <span aria-hidden="true" className="command-key">
                      1
                    </span>
                    <span className="command-copy">
                      <strong>持ち物を開く</strong>
                      <span>server authority / ledger</span>
                    </span>
                  </button>
                </article>
              </section>
            ) : (
              <>
                <section className="inventory-toolbar" aria-labelledby="inventory-tools-title">
                  <div className="section-heading">
                    <p className="eyebrow">TOOLS / SAFE MUTATIONS</p>
                    <h2 id="inventory-tools-title">取得と整理</h2>
                  </div>
                  <div className="capacity-meter">
                    <div className="capacity-meter__label">
                      <span>Inventory capacity</span>
                      <strong>
                        {activeCount} / {inventory.capacity}
                      </strong>
                    </div>
                    <div className="capacity-meter__track" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.min(100, (activeCount / inventory.capacity) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="inventory-actions">
                    <button
                      className="command-button"
                      disabled={busy}
                      type="button"
                      onClick={() => void claim('rain-tower.boss')}
                    >
                      <span aria-hidden="true" className="command-key">
                        1
                      </span>
                      <span className="command-copy">
                        <strong>Rare以上をmint</strong>
                        <span>server source: tower boss</span>
                      </span>
                    </button>
                    <button
                      className="command-button"
                      disabled={busy}
                      type="button"
                      onClick={() => void claim('rain-tower.cache')}
                    >
                      <span aria-hidden="true" className="command-key">
                        2
                      </span>
                      <span className="command-copy">
                        <strong>Cacheをmint</strong>
                        <span>bounded weighted drop</span>
                      </span>
                    </button>
                    <button
                      className="command-button"
                      disabled={busy || selectedIds.size === 0}
                      type="button"
                      onClick={requestSalvage}
                    >
                      <span aria-hidden="true" className="command-key">
                        3
                      </span>
                      <span className="command-copy">
                        <strong>選択を分解</strong>
                        <span>confirmation + ledger consume</span>
                      </span>
                    </button>
                  </div>
                  {confirmation ? (
                    <div className="confirmation-panel" role="alert">
                      <strong>保護されたアイテムを分解しますか？</strong>
                      <p>
                        Rare以上、favorite、lockedは明示確認が必要です。分解後は復元できません。
                      </p>
                      <div className="inline-actions">
                        <button
                          className="command-button"
                          disabled={busy}
                          type="button"
                          onClick={() => void salvage(confirmation.confirm, confirmation.unlock)}
                        >
                          確認して分解
                        </button>
                        <button
                          className="command-button"
                          disabled={busy}
                          type="button"
                          onClick={() => setConfirmation(null)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="content-grid">
                  <article className="info-panel" aria-labelledby="derived-title">
                    <p className="eyebrow">EQUIPMENT / AUTHORITATIVE</p>
                    <h2 id="derived-title">Derived stats</h2>
                    <dl className="detail-list stats-grid">
                      <div>
                        <dt>Attack</dt>
                        <dd>{inventory.derivedStats.attack}</dd>
                      </div>
                      <div>
                        <dt>Armor</dt>
                        <dd>{inventory.derivedStats.armor}</dd>
                      </div>
                      <div>
                        <dt>Vitality</dt>
                        <dd>
                          {inventory.derivedStats.vitality} / {inventory.derivedStats.maxVitality}
                        </dd>
                      </div>
                      <div>
                        <dt>Focus</dt>
                        <dd>
                          {inventory.derivedStats.focus} / {inventory.derivedStats.maxFocus}
                        </dd>
                      </div>
                      <div>
                        <dt>Guard</dt>
                        <dd>{inventory.derivedStats.guard}</dd>
                      </div>
                      <div>
                        <dt>Speed / Luck</dt>
                        <dd>
                          {inventory.derivedStats.speed} / {inventory.derivedStats.luck}
                        </dd>
                      </div>
                    </dl>
                    <p className="muted-copy">
                      装備中アイテムだけをWorker側のgame-core規則で集計しています。
                    </p>
                    <ul className="bullet-list">
                      {inventory.derivedStats.explanations.length === 0 ? (
                        <li>まだ装備はありません。</li>
                      ) : (
                        inventory.derivedStats.explanations.map((explanation) => (
                          <li key={explanation.itemId}>
                            {explanation.itemName}:{' '}
                            {Object.entries(explanation.stats)
                              .filter(([, value]) => value > 0)
                              .map(([key, value]) => `${key} +${value}`)
                              .join(', ')}
                          </li>
                        ))
                      )}
                    </ul>
                  </article>
                  <article className="info-panel" aria-labelledby="codex-title">
                    <p className="eyebrow">CODEX / PROGRESS</p>
                    <h2 id="codex-title">発見記録</h2>
                    <p>
                      {inventory.codex.length} entries / Scrap{' '}
                      {inventory.materials['material.scrap'] ?? 0}
                    </p>
                    <ul className="bullet-list codex-mini-list">
                      {inventory.codex.slice(0, 8).map((entry) => (
                        <li key={`${entry.entryType}-${entry.entryId}`}>
                          {entry.entryType}: {entry.entryId} ×{entry.discoveryCount}
                        </li>
                      ))}
                      {inventory.codex.length === 0 ? (
                        <li>ドロップをmintするとbaseとaffixが記録されます。</li>
                      ) : null}
                    </ul>
                  </article>
                </section>

                <section className="panel-stack" aria-labelledby="items-title">
                  <div className="section-heading">
                    <p className="eyebrow">ITEM LIST / COMPARE</p>
                    <h2 id="items-title">アイテム一覧</h2>
                  </div>
                  <div className="form-grid inventory-filters">
                    <label className="form-field">
                      <span>Filter by rarity</span>
                      <select
                        value={filter}
                        onChange={(event) => setFilter(event.target.value as FilterMode)}
                      >
                        <option value="all">All</option>
                        {RARITY_ORDER.map((rarity) => (
                          <option key={rarity} value={rarity}>
                            {rarity}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Sort</span>
                      <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value as SortMode)}
                      >
                        <option value="recent">Recent</option>
                        <option value="rarity">Rarity</option>
                        <option value="power">Advisory power</option>
                        <option value="name">Name</option>
                      </select>
                    </label>
                  </div>
                  <label className="bulk-select">
                    <input
                      checked={
                        visibleItems.length > 0 &&
                        visibleItems.every((item) => selectedIds.has(item.id))
                      }
                      type="checkbox"
                      onChange={(event) =>
                        setSelectedIds(
                          event.target.checked
                            ? new Set(visibleItems.map((item) => item.id))
                            : new Set(),
                        )
                      }
                    />{' '}
                    <span>表示中のアイテムを一括選択</span>
                  </label>
                  <div className="inventory-list">
                    {visibleItems.map((item) => (
                      <article
                        className="inventory-card inventory-card--interactive"
                        data-testid={`inventory-item-${item.id}`}
                        key={item.id}
                      >
                        <div>
                          <label className="item-select">
                            <input
                              aria-label={`${itemName(item)}を選択`}
                              checked={selectedIds.has(item.id)}
                              type="checkbox"
                              onChange={(event) =>
                                setSelectedIds((current) => {
                                  const next = new Set(current);
                                  if (event.target.checked) next.add(item.id);
                                  else next.delete(item.id);
                                  return next;
                                })
                              }
                            />
                            <span className="visually-hidden">分解選択</span>
                          </label>
                          <p className="eyebrow">
                            {item.slot} / {item.itemLevel}
                          </p>
                          <h3>{itemName(item)}</h3>
                          <p>
                            {item.rarity} · quality {item.quality} · advisory power{' '}
                            {itemPower(item)}
                          </p>
                          <div className="tag-row">
                            <span className="tag">
                              {item.location === 'equipment' ? 'EQUIPPED' : 'PACK'}
                            </span>
                            {item.locked ? <span className="tag">LOCKED</span> : null}
                            {item.favorite ? <span className="tag">FAVORITE</span> : null}
                            {item.bindState === 'account-bound' ? (
                              <span className="tag">BOUND</span>
                            ) : null}
                          </div>
                          <dl className="detail-list provenance-list">
                            <div>
                              <dt>Provenance</dt>
                              <dd>
                                {item.provenance.sourceRef} / {item.provenance.contentVersion}
                              </dd>
                            </div>
                            <div>
                              <dt>Seed hash</dt>
                              <dd>{item.provenance.seedHash}</dd>
                            </div>
                            <div>
                              <dt>Affixes</dt>
                              <dd>
                                {item.affixes.length === 0
                                  ? 'none'
                                  : item.affixes
                                      .map((affix) => `${affix.name} +${affix.value}`)
                                      .join(', ')}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <div className="inventory-card__meta">
                          <strong>{item.rarity.toUpperCase()}</strong>
                          <button
                            className="utility-link"
                            disabled={busy}
                            type="button"
                            onClick={() => void equip(item)}
                          >
                            {item.location === 'equipment' ? '外す' : '装備'}
                          </button>
                          <button
                            className="utility-link"
                            disabled={busy}
                            type="button"
                            onClick={() => void toggleLock(item)}
                          >
                            {item.locked ? 'Unlock' : 'Lock'}
                          </button>
                          <button
                            className="utility-link"
                            disabled={busy}
                            type="button"
                            onClick={() => void mark(item)}
                          >
                            {item.favorite ? 'Unfavorite' : 'Favorite'}
                          </button>
                        </div>
                      </article>
                    ))}
                    {visibleItems.length === 0 ? (
                      <section className="state-panel state-panel--empty">
                        <h2>空の一覧</h2>
                        <p>フィルターに一致するactive itemはありません。</p>
                      </section>
                    ) : null}
                  </div>
                </section>
              </>
            )}
            {message ? (
              <p aria-live="polite" className="vertical-message">
                {message}
              </p>
            ) : null}
          </main>

          <aside className="session-rail" aria-labelledby="inventory-rail-title">
            <p className="eyebrow">SESSION / INVENTORY</p>
            <h2 id="inventory-rail-title">Safe choices</h2>
            <dl className="rail-list">
              <div>
                <dt>Authority</dt>
                <dd>Worker + D1</dd>
              </div>
              <div>
                <dt>Mutation</dt>
                <dd>CSRF + key</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{inventory ? `version ${inventory.playerVersion}` : 'not started'}</dd>
              </div>
            </dl>
            <p className="rail-note">
              Rare/unique/lockedは確認なしに分解できません。Trade、premium、rerollはこのpacketにありません。
            </p>
          </aside>
        </div>
        <footer className="site-footer">
          <span>NEVERLIGHT / INVENTORY</span>
          <span>loot ruleset 1.0.0</span>
          <span>seed hash only</span>
        </footer>
      </div>
    </div>
  );
}
