export const LOOT_RULESET_VERSION = '1.0.0' as const;
export const LOOT_CONTENT_VERSION = '0.1.0' as const;

export type LootRarity = 'common' | 'uncommon' | 'rare' | 'unique' | 'relic';
export type LootItemSlot = 'weapon' | 'guard' | 'head' | 'body' | 'accessory' | 'relic';
export type LootLocation = 'inventory' | 'vault' | 'equipment';
export type LootBindState = 'unbound-until-equipped' | 'account-bound';

export interface LootStatBlock {
  armor: number;
  attack: number;
  focus: number;
  guard: number;
  luck: number;
  speed: number;
  vitality: number;
  ward: number;
}

export interface LootAffixRoll {
  budget: number;
  id: string;
  name: string;
  stat: keyof LootStatBlock;
  tier: number;
  value: number;
}

export interface LootProvenance {
  contentVersion: string;
  rulesetVersion: string;
  seedHash: string;
  sourceRef: string;
}

export interface LootItemInstance {
  affixes: LootAffixRoll[];
  baseId: string;
  baseStats: LootStatBlock;
  bindState: LootBindState;
  equipmentSlot: LootItemSlot | null;
  favorite: boolean;
  id: string;
  itemLevel: number;
  location: LootLocation;
  locked: boolean;
  provenance: LootProvenance;
  quality: number;
  rarity: LootRarity;
  slot: LootItemSlot;
  status: 'active' | 'salvaged';
  uniqueRule: string | null;
}

export interface LootResolution {
  item: LootItemInstance;
  seed: number;
  seedHash: string;
}

export interface LootSourceOptions {
  contentVersion?: string;
  itemId: string;
  itemLevel?: number;
  minimumRarity?: LootRarity;
  rulesetVersion?: string;
  seed: number;
  sourceRef: string;
}

export interface PlayerStatSeed {
  armor: number;
  attack: number;
  focus: number;
  guard: number;
  luck: number;
  maxFocus: number;
  maxVitality: number;
  speed: number;
  vitality: number;
  ward: number;
}

export interface DerivedPlayerStats extends PlayerStatSeed {
  explanations: Array<{
    itemId: string;
    itemName: string;
    stats: Partial<LootStatBlock>;
  }>;
}

export interface SalvageResult {
  materialId: 'material.scrap';
  quantity: number;
}

export const LOOT_RARITY_BUDGETS: Readonly<Record<LootRarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 4,
  unique: 7,
  relic: 9,
};

export const LOOT_AFFIX_COUNT_BOUNDS: Readonly<Record<LootRarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  unique: 3,
  relic: 4,
};

export const LOOT_RARITY_WEIGHTS: Readonly<Record<LootRarity, number>> = {
  common: 600,
  uncommon: 270,
  rare: 100,
  unique: 30,
  relic: 0,
};

export interface LootBaseDefinition {
  baseId: string;
  baseStats: LootStatBlock;
  name: string;
  slot: LootItemSlot;
}

export const LOOT_BASE_DEFINITIONS: readonly LootBaseDefinition[] = [
  {
    baseId: 'item.rain-shear',
    baseStats: {
      armor: 0,
      attack: 5,
      focus: 0,
      guard: 0,
      luck: 0,
      speed: 1,
      vitality: 0,
      ward: 0,
    },
    name: 'Rain Shear',
    slot: 'weapon',
  },
  {
    baseId: 'item.signal-guard',
    baseStats: {
      armor: 2,
      attack: 0,
      focus: 0,
      guard: 3,
      luck: 0,
      speed: 0,
      vitality: 2,
      ward: 1,
    },
    name: 'Signal Guard',
    slot: 'guard',
  },
  {
    baseId: 'item.tower-relic',
    baseStats: {
      armor: 0,
      attack: 0,
      focus: 2,
      guard: 0,
      luck: 1,
      speed: 0,
      vitality: 1,
      ward: 2,
    },
    name: 'Tower Relic',
    slot: 'relic',
  },
];

interface LootAffixDefinition {
  allowedSlots: readonly LootItemSlot[];
  id: string;
  name: string;
  stat: keyof LootStatBlock;
  tiers: readonly { budget: number; max: number; min: number; tier: number }[];
}

const LOOT_AFFIX_DEFINITIONS: readonly LootAffixDefinition[] = [
  {
    allowedSlots: ['weapon', 'accessory', 'relic'],
    id: 'affix.echoing',
    name: 'Echoing',
    stat: 'focus',
    tiers: [
      { budget: 1, max: 2, min: 1, tier: 1 },
      { budget: 2, max: 4, min: 2, tier: 2 },
    ],
  },
  {
    allowedSlots: ['guard', 'head', 'body'],
    id: 'affix.steadfast',
    name: 'Steadfast',
    stat: 'armor',
    tiers: [
      { budget: 1, max: 2, min: 1, tier: 1 },
      { budget: 2, max: 4, min: 2, tier: 2 },
    ],
  },
  {
    allowedSlots: ['weapon', 'accessory'],
    id: 'affix.swift',
    name: 'Swift',
    stat: 'speed',
    tiers: [{ budget: 1, max: 3, min: 1, tier: 1 }],
  },
  {
    allowedSlots: ['weapon', 'guard', 'relic'],
    id: 'affix.fortune',
    name: 'Fortunate',
    stat: 'luck',
    tiers: [{ budget: 1, max: 3, min: 1, tier: 1 }],
  },
];

const RARITY_ORDER: readonly LootRarity[] = ['common', 'uncommon', 'rare', 'unique', 'relic'];

class LootPrng {
  private state: number;

  constructor(seed: number) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
      throw new RangeError('The loot seed must be an unsigned safe integer.');
    }
    this.state = seed >>> 0 || 0x6d2b_79f5;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError('The loot PRNG bound must be a positive safe integer.');
    }
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return Math.floor((this.state / 4_294_967_296) * maxExclusive);
  }
}

function stableLootString(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(stableLootString).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableLootString(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError('Unsupported loot hash value.');
}

export function hashLootValue(value: unknown): string {
  let hash = 0x811c_9dc5;
  const serialized = stableLootString(value);
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function chooseRarity(prng: LootPrng, minimumRarity: LootRarity | undefined): LootRarity {
  const minimumIndex = minimumRarity ? RARITY_ORDER.indexOf(minimumRarity) : 0;
  const eligible = RARITY_ORDER.slice(minimumIndex);
  const total = eligible.reduce((sum, rarity) => sum + LOOT_RARITY_WEIGHTS[rarity], 0);
  if (total <= 0) return eligible[0] ?? 'common';
  let roll = prng.nextInt(total);
  for (const rarity of eligible) {
    roll -= LOOT_RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return eligible.at(-1) ?? 'common';
}

function chooseAffixes(prng: LootPrng, slot: LootItemSlot, rarity: LootRarity): LootAffixRoll[] {
  const remainingBudget = LOOT_RARITY_BUDGETS[rarity];
  const maximumCount = LOOT_AFFIX_COUNT_BOUNDS[rarity];
  const eligible = LOOT_AFFIX_DEFINITIONS.filter((affix) => affix.allowedSlots.includes(slot));
  const selected: LootAffixRoll[] = [];
  let budgetLeft = remainingBudget;
  while (selected.length < maximumCount && eligible.length > 0) {
    const candidates = eligible.filter(
      (affix) => !selected.some((picked) => picked.id === affix.id),
    );
    if (candidates.length === 0) break;
    const affix = candidates[prng.nextInt(candidates.length)];
    if (!affix) break;
    const tiers = affix.tiers.filter((tier) => tier.budget <= budgetLeft);
    if (tiers.length === 0) break;
    const tier = tiers[prng.nextInt(tiers.length)];
    if (!tier) break;
    const value = tier.min + prng.nextInt(tier.max - tier.min + 1);
    selected.push({
      budget: tier.budget,
      id: affix.id,
      name: affix.name,
      stat: affix.stat,
      tier: tier.tier,
      value,
    });
    budgetLeft -= tier.budget;
  }
  return selected;
}

export function resolveLootDrop(options: LootSourceOptions): LootResolution {
  const rulesetVersion = options.rulesetVersion ?? LOOT_RULESET_VERSION;
  const contentVersion = options.contentVersion ?? LOOT_CONTENT_VERSION;
  const itemLevel = Math.min(20, Math.max(1, Math.trunc(options.itemLevel ?? 1)));
  const prng = new LootPrng(options.seed);
  const base =
    LOOT_BASE_DEFINITIONS[prng.nextInt(LOOT_BASE_DEFINITIONS.length)] ?? LOOT_BASE_DEFINITIONS[0];
  if (!base) throw new Error('Loot base definitions are empty.');
  const rarity = chooseRarity(prng, options.minimumRarity);
  const quality = 70 + prng.nextInt(31);
  const affixes = chooseAffixes(prng, base.slot, rarity);
  const seedHash = hashLootValue({
    contentVersion,
    rulesetVersion,
    seed: options.seed,
    sourceRef: options.sourceRef,
  });
  const item: LootItemInstance = {
    affixes,
    baseId: base.baseId,
    baseStats: { ...base.baseStats },
    bindState: 'unbound-until-equipped',
    equipmentSlot: null,
    favorite: false,
    id: options.itemId,
    itemLevel,
    location: 'inventory',
    locked: false,
    provenance: { contentVersion, rulesetVersion, seedHash, sourceRef: options.sourceRef },
    quality,
    rarity,
    slot: base.slot,
    status: 'active',
    uniqueRule: rarity === 'unique' || rarity === 'relic' ? 'signal-afterglow' : null,
  };
  return { item, seed: options.seed, seedHash };
}

export function itemStatContribution(
  item: Pick<LootItemInstance, 'affixes' | 'baseStats'>,
): LootStatBlock {
  const stats = { ...item.baseStats };
  for (const affix of item.affixes) stats[affix.stat] += affix.value;
  return stats;
}

export function deriveEquipmentStats(
  base: PlayerStatSeed,
  items: readonly LootItemInstance[],
): DerivedPlayerStats {
  const derived: PlayerStatSeed = { ...base };
  const explanations: DerivedPlayerStats['explanations'] = [];
  for (const item of items) {
    if (item.status !== 'active' || item.location !== 'equipment') continue;
    const contribution = itemStatContribution(item);
    derived.armor += contribution.armor;
    derived.attack += contribution.attack;
    derived.focus += contribution.focus;
    derived.guard += contribution.guard;
    derived.luck += contribution.luck;
    derived.maxFocus += contribution.focus;
    derived.maxVitality += contribution.vitality;
    derived.speed += contribution.speed;
    derived.vitality += contribution.vitality;
    derived.ward += contribution.ward;
    explanations.push({
      itemId: item.id,
      itemName: item.baseId,
      stats: contribution,
    });
  }
  derived.vitality = Math.min(derived.vitality, derived.maxVitality);
  derived.focus = Math.min(derived.focus, derived.maxFocus);
  return { ...derived, explanations };
}

export function calculateSalvage(
  item: Pick<LootItemInstance, 'affixes' | 'rarity'>,
): SalvageResult {
  const base = { common: 1, uncommon: 2, rare: 4, unique: 7, relic: 10 }[item.rarity];
  return { materialId: 'material.scrap', quantity: base + item.affixes.length };
}

export function lootBoundsReport(item: Pick<LootItemInstance, 'affixes' | 'rarity' | 'quality'>): {
  affixBudget: number;
  affixCount: number;
  maxAffixes: number;
  maxBudget: number;
  qualityInRange: boolean;
} {
  return {
    affixBudget: item.affixes.reduce((sum, affix) => sum + affix.budget, 0),
    affixCount: item.affixes.length,
    maxAffixes: LOOT_AFFIX_COUNT_BOUNDS[item.rarity],
    maxBudget: LOOT_RARITY_BUDGETS[item.rarity],
    qualityInRange: item.quality >= 70 && item.quality <= 100,
  };
}
