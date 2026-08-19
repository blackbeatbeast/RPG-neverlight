const fixture = process.argv.includes('--fixture')
  ? process.argv[process.argv.indexOf('--fixture') + 1]
  : 'all';

if (fixture !== 'all') throw new Error('--fixture must be all.');

const ledger = [
  { assetInstanceId: 'fixture-item-1', assetType: 'item', delta: 1, reason: 'LOOT_ITEM_MINT' },
  {
    assetInstanceId: 'fixture-item-1',
    assetType: 'item',
    delta: -1,
    reason: 'ITEM_SALVAGE_CONSUME',
  },
  {
    assetInstanceId: null,
    assetType: 'material',
    delta: 5,
    materialKey: 'material.scrap',
    reason: 'MATERIAL_SALVAGE_GRANT',
  },
  { assetInstanceId: 'fixture-item-2', assetType: 'item', delta: 1, reason: 'LOOT_ITEM_MINT' },
];

const itemBalances = new Map();
const materialBalances = new Map();
for (const event of ledger) {
  if (event.assetType === 'item' && event.assetInstanceId) {
    itemBalances.set(
      event.assetInstanceId,
      (itemBalances.get(event.assetInstanceId) ?? 0) + event.delta,
    );
  } else if (event.assetType === 'material' && event.materialKey) {
    materialBalances.set(
      event.materialKey,
      (materialBalances.get(event.materialKey) ?? 0) + event.delta,
    );
  }
}

const invalidItems = [...itemBalances].filter(([, balance]) => balance < 0 || balance > 1);
const invalidMaterials = [...materialBalances].filter(([, balance]) => balance < 0);
if (invalidItems.length || invalidMaterials.length) {
  console.error(JSON.stringify({ invalidItems, invalidMaterials }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        fixture,
        itemBalances: Object.fromEntries(itemBalances),
        materialBalances: Object.fromEntries(materialBalances),
        status: 'reconciled',
        transactionCount: 3,
      },
      null,
      2,
    ),
  );
}
