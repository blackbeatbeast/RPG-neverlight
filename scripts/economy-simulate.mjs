import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const {
  LOOT_AFFIX_COUNT_BOUNDS,
  LOOT_RARITY_BUDGETS,
  calculateSalvage,
  hashLootValue,
  lootBoundsReport,
  resolveLootDrop,
} = await import('../packages/game-core/dist/index.js');

function integerArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > 100_000) {
    throw new Error(`${name} must be an integer between 1 and 100000.`);
  }
  return value;
}

const runs = integerArgument('--runs', 10_000);
const bundleIndex = process.argv.indexOf('--bundle');
const bundleName = bundleIndex >= 0 ? process.argv[bundleIndex + 1] : undefined;
let bundleInfo = null;
if (bundleName !== undefined) {
  if (bundleName !== 'first-region') {
    throw new Error(`Unknown content bundle: ${bundleName}`);
  }
  const bundlePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../content/first-region/bundle.json',
  );
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const counts = {
    affixes: bundle.affixes.length,
    characters: bundle.characters.length,
    enemies: bundle.enemies.length,
    items: bundle.items.length,
    nodes: bundle.nodes.length,
  };
  if (
    bundle.contentVersion !== '0.4.0' ||
    counts.characters < 4 ||
    counts.enemies < 7 ||
    counts.items < 20 ||
    counts.affixes < 20 ||
    counts.nodes < 12
  ) {
    throw new Error(`Content bundle does not meet first-region counts: ${JSON.stringify(counts)}`);
  }
  bundleInfo = {
    checksum: hashLootValue({
      affixes: bundle.affixes.map((entry) => entry.id).sort(),
      characters: bundle.characters.map((entry) => entry.id).sort(),
      contentVersion: bundle.contentVersion,
      enemies: bundle.enemies.map((entry) => entry.id).sort(),
      items: bundle.items.map((entry) => entry.id).sort(),
      nodes: bundle.nodes.map((entry) => entry.id).sort(),
    }),
    counts,
    name: bundleName,
  };
}
const rarities = { common: 0, uncommon: 0, rare: 0, unique: 0, relic: 0 };
let totalAffixes = 0;
let totalScrap = 0;
let maxAffixCount = 0;
let maxAffixBudget = 0;
let minQuality = 100;
let maxQuality = 0;

for (let seed = 0; seed < runs; seed += 1) {
  const item = resolveLootDrop({
    itemId: `simulation-item-${seed}`,
    seed,
    sourceRef: 'simulation.fixture',
  }).item;
  const bounds = lootBoundsReport(item);
  if (
    bounds.affixCount > LOOT_AFFIX_COUNT_BOUNDS[item.rarity] ||
    bounds.affixBudget > LOOT_RARITY_BUDGETS[item.rarity] ||
    !bounds.qualityInRange
  ) {
    throw new Error(`Loot bound violation at seed ${seed}: ${JSON.stringify(bounds)}`);
  }
  rarities[item.rarity] += 1;
  totalAffixes += bounds.affixCount;
  totalScrap += calculateSalvage(item).quantity;
  maxAffixCount = Math.max(maxAffixCount, bounds.affixCount);
  maxAffixBudget = Math.max(maxAffixBudget, bounds.affixBudget);
  minQuality = Math.min(minQuality, item.quality);
  maxQuality = Math.max(maxQuality, item.quality);
}

const metrics = {
  averageAffixes: Number((totalAffixes / runs).toFixed(4)),
  averageScrap: Number((totalScrap / runs).toFixed(4)),
  maxAffixBudget,
  maxAffixCount,
  minQuality,
  maxQuality,
  rarities,
  runs,
  totalScrap,
};
console.log(
  JSON.stringify(
    {
      bundle: bundleInfo,
      bounds: {
        affixCount: LOOT_AFFIX_COUNT_BOUNDS,
        affixBudget: LOOT_RARITY_BUDGETS,
        quality: [70, 100],
      },
      checksum: hashLootValue(metrics),
      metrics,
    },
    null,
    2,
  ),
);
