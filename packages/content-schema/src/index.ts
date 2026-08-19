import { z } from 'zod';

export const CONTENT_SCHEMA_VERSION = 1 as const;

const stableIdPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const localizationKeyPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const stableIdSchema = z.string().regex(stableIdPattern, {
  message: 'must be a lowercase stable ID such as char.mireia-voss',
});
export const localizationKeySchema = z.string().regex(localizationKeyPattern, {
  message: 'must be a lowercase localization key',
});
export const versionSchema = z.string().regex(semverPattern, {
  message: 'must be a semantic version such as 1.0.0',
});

const nonEmptyString = z.string().trim().min(1);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'must be an ISO calendar date (YYYY-MM-DD)',
});
const localeSchema = z.string().regex(/^[a-z]{2}(?:-(?:[A-Z]{2}|[A-Z][a-z]{1,3}))?$/, {
  message: 'must be a locale such as ja-JP or en',
});
const nonNegativeInteger = z.number().int().min(0);
const positiveInteger = z.number().int().min(1);

const uniqueArray = <T>(items: T[]) => new Set(items).size === items.length;
const idListSchema = z
  .array(stableIdSchema)
  .min(1)
  .refine(uniqueArray, { message: 'must contain unique stable IDs' });
const idListAllowEmptySchema = z
  .array(stableIdSchema)
  .refine(uniqueArray, { message: 'must contain unique stable IDs' });
const keyListSchema = z
  .array(localizationKeySchema)
  .min(1)
  .refine(uniqueArray, { message: 'must contain unique localization keys' });
const stringListSchema = z
  .array(nonEmptyString)
  .min(1)
  .refine(uniqueArray, { message: 'must contain unique values' });

const raritySchema = z.enum(['common', 'uncommon', 'rare', 'unique', 'relic']);
const rarityBudgetSchema = z
  .object({
    common: nonNegativeInteger.max(20),
    uncommon: nonNegativeInteger.max(20),
    rare: nonNegativeInteger.max(20),
    unique: nonNegativeInteger.max(20),
    relic: nonNegativeInteger.max(20),
  })
  .strict();

const provenanceSchema = z
  .object({
    creator: nonEmptyString,
    provider: nonEmptyString,
    license: nonEmptyString,
    createdAt: dateSchema,
    sourceInputs: stringListSchema,
    rightsStatus: z.enum(['original', 'licensed', 'generated-reviewed']),
    reviewer: nonEmptyString,
    reviewedAt: dateSchema,
    checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict();

const contentReviewSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']),
    reviewer: nonEmptyString,
    reviewedAt: dateSchema,
    notesKey: localizationKeySchema.nullable(),
  })
  .strict();

export const assetSchema = z
  .object({
    id: stableIdSchema,
    kind: z.enum(['character-portrait', 'scene', 'card-art', 'icon', 'ui']),
    path: nonEmptyString,
    altTextKey: localizationKeySchema,
    audience: z.enum(['general', 'suggestive']),
    generalFallbackId: stableIdSchema.nullable(),
    depictedCharacterId: stableIdSchema.nullable(),
    provenance: provenanceSchema,
    contentReview: contentReviewSchema.nullable(),
  })
  .strict();

export const characterSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    age: z.number().int().min(20),
    roleKey: localizationKeySchema,
    gameplayFunctionKey: localizationKeySchema,
    traitKeys: keyListSchema,
    prohibitedMotifKeys: keyListSchema,
    generalAssetId: stableIdSchema,
    suggestiveAssetId: stableIdSchema.nullable(),
  })
  .strict();

export const zoneSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    summaryKey: localizationKeySchema,
    routeIds: idListSchema,
  })
  .strict();

export const routeSchema = z
  .object({
    id: stableIdSchema,
    zoneId: stableIdSchema,
    nameKey: localizationKeySchema,
    descriptionKey: localizationKeySchema,
    entryNodeId: stableIdSchema,
    terminalNodeIds: idListSchema,
    nodeIds: idListSchema,
  })
  .strict();

export const nodeSchema = z
  .object({
    id: stableIdSchema,
    routeId: stableIdSchema,
    type: z.enum(['scene', 'encounter', 'cache', 'rest', 'fork', 'echo', 'boss', 'exit']),
    textKey: localizationKeySchema.nullable(),
    nextNodeIds: idListAllowEmptySchema,
    commandIds: idListAllowEmptySchema,
    enemyIds: idListAllowEmptySchema,
    dropTableId: stableIdSchema.nullable(),
  })
  .strict();

export const enemySchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    behaviorTags: stringListSchema.min(2),
    baseStats: z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), nonNegativeInteger.max(100000)),
    dropTableId: stableIdSchema,
  })
  .strict();

export const commandSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    descriptionKey: localizationKeySchema,
    kind: z.enum(['basic', 'skill', 'item', 'shift', 'flee']),
    target: z.enum(['self', 'single-enemy', 'all-enemies', 'ally', 'area']),
    queueSlots: z.number().int().min(1).max(3),
    powerCost: nonNegativeInteger.max(100),
  })
  .strict();

export const itemSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    descriptionKey: localizationKeySchema,
    slot: z.enum(['weapon', 'guard', 'head', 'body', 'accessory', 'relic', 'consumable']),
    rarity: raritySchema,
    tags: stringListSchema,
    baseStats: z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), nonNegativeInteger.max(100000)),
    affixBudget: rarityBudgetSchema,
    tradePolicy: z.enum(['unbound', 'unbound-until-equipped', 'account-bound']),
  })
  .strict();

const affixTierSchema = z
  .object({
    tier: positiveInteger.max(10),
    minValue: nonNegativeInteger.max(100000),
    maxValue: nonNegativeInteger.max(100000),
    budget: positiveInteger.max(20),
  })
  .strict();

export const affixSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    allowedSlots: idListSchema,
    tags: stringListSchema,
    conflicts: idListAllowEmptySchema,
    maximumBudget: positiveInteger.max(20),
    tiers: z.array(affixTierSchema).min(1),
  })
  .strict();

const cardEffectSchema = z
  .object({
    type: z.enum(['tag-threshold', 'route-modifier', 'command-modifier']),
    tag: nonEmptyString,
    modifier: nonEmptyString,
    cap: nonNegativeInteger.max(100),
  })
  .strict();

export const cardSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    descriptionKey: localizationKeySchema,
    characterId: stableIdSchema.nullable(),
    rarity: raritySchema,
    acquisition: z
      .array(z.enum(['codex-milestone', 'zone-boss', 'dispatch-chain', 'crafting', 'discovery']))
      .min(1)
      .refine(uniqueArray, { message: 'must contain unique acquisition methods' }),
    duplicateInk: nonNegativeInteger.max(100000),
    effect: cardEffectSchema,
    generalAssetId: stableIdSchema,
    suggestiveAssetId: stableIdSchema.nullable(),
  })
  .strict();

const recipeInputSchema = z
  .object({
    resourceId: stableIdSchema,
    quantity: positiveInteger.max(100000),
  })
  .strict();

export const recipeSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    descriptionKey: localizationKeySchema,
    inputs: z.array(recipeInputSchema).min(1),
    outputItemId: stableIdSchema,
    outputQuantity: positiveInteger.max(100000),
  })
  .strict();

export const codexSchema = z
  .object({
    id: stableIdSchema,
    category: z.enum([
      'character',
      'location',
      'enemy',
      'item',
      'affix',
      'card',
      'recipe',
      'world',
    ]),
    titleKey: localizationKeySchema,
    bodyKey: localizationKeySchema,
    relatedIds: idListAllowEmptySchema,
  })
  .strict();

const questStepSchema = z
  .object({
    id: stableIdSchema,
    textKey: localizationKeySchema,
    targetId: stableIdSchema,
    targetType: z.enum(['discover', 'defeat', 'equip', 'salvage', 'codex']),
    count: positiveInteger.max(1000),
  })
  .strict();

export const questSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    descriptionKey: localizationKeySchema,
    zoneId: stableIdSchema,
    routeId: stableIdSchema,
    steps: z.array(questStepSchema).min(1),
    rewardItemIds: idListAllowEmptySchema,
    codexId: stableIdSchema.nullable(),
  })
  .strict();

export const dispatchSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    descriptionKey: localizationKeySchema,
    routeId: stableIdSchema,
    durationMinutes: positiveInteger.max(60),
    risk: z.enum(['low', 'medium', 'high']),
    rewardDropTableId: stableIdSchema,
    codexId: stableIdSchema.nullable(),
  })
  .strict();

const dropEntrySchema = z
  .object({
    itemId: stableIdSchema,
    chance: z.number().finite().min(0).max(1),
    minQuantity: positiveInteger.max(100000),
    maxQuantity: positiveInteger.max(100000),
  })
  .strict();

export const dropTableSchema = z
  .object({
    id: stableIdSchema,
    nameKey: localizationKeySchema,
    entries: z.array(dropEntrySchema).min(1),
    noDropChance: z.number().finite().min(0).max(1),
  })
  .strict();

export const contentBundleSchema = z
  .object({
    schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
    contentVersion: versionSchema,
    rulesetVersion: versionSchema,
    compatibility: z
      .object({
        minimumRulesetVersion: versionSchema,
        maximumRulesetVersion: versionSchema,
      })
      .strict(),
    defaultLocale: localeSchema,
    locales: z.record(localeSchema, z.record(localizationKeySchema, nonEmptyString)),
    assets: z.array(assetSchema),
    characters: z.array(characterSchema),
    zones: z.array(zoneSchema),
    routes: z.array(routeSchema),
    nodes: z.array(nodeSchema),
    enemies: z.array(enemySchema),
    commands: z.array(commandSchema),
    items: z.array(itemSchema),
    affixes: z.array(affixSchema),
    cards: z.array(cardSchema),
    recipes: z.array(recipeSchema),
    codex: z.array(codexSchema),
    quests: z.array(questSchema),
    dispatches: z.array(dispatchSchema),
    dropTables: z.array(dropTableSchema),
  })
  .strict();

export type Asset = z.infer<typeof assetSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type Route = z.infer<typeof routeSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Enemy = z.infer<typeof enemySchema>;
export type Command = z.infer<typeof commandSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Affix = z.infer<typeof affixSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type CodexEntry = z.infer<typeof codexSchema>;
export type Quest = z.infer<typeof questSchema>;
export type Dispatch = z.infer<typeof dispatchSchema>;
export type DropTable = z.infer<typeof dropTableSchema>;
export type ContentBundle = z.infer<typeof contentBundleSchema>;

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ContentValidationReport {
  readonly valid: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly bundle?: ContentBundle;
}

const pathFor = (collection: string, index: number, field?: string) =>
  `${collection}[${index}]${field ? `.${field}` : ''}`;

const formatZodPath = (path: PropertyKey[]): string =>
  path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') return `${result}[${String(segment)}]`;
    const key = String(segment);
    return result ? `${result}.${key}` : key;
  }, '');

const compareVersions = (left: string, right: string): number => {
  const leftParts = (left.split(/[+-]/u)[0] ?? left).split('.').map(Number);
  const rightParts = (right.split(/[+-]/u)[0] ?? right).split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

const issueFromZod = (issue: z.core.$ZodIssue): ValidationIssue => ({
  path: issue.path.length ? formatZodPath(issue.path) : '<root>',
  message: issue.message,
});

function registerDefinitions(
  definitions: Map<string, string>,
  errors: ValidationIssue[],
  collection: string,
  entries: readonly { readonly id: string }[],
) {
  entries.forEach((entry, index) => {
    const path = pathFor(collection, index, 'id');
    const previous = definitions.get(entry.id);
    if (previous) {
      errors.push({
        path,
        message: `duplicate stable ID ${entry.id}; already declared at ${previous}`,
      });
      return;
    }
    definitions.set(entry.id, path);
  });
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map(canonicalize);
    if (
      normalized.every(
        (entry): entry is Record<string, unknown> & { id: string } =>
          typeof entry === 'object' &&
          entry !== null &&
          !Array.isArray(entry) &&
          typeof (entry as { id?: unknown }).id === 'string',
      )
    ) {
      return normalized.slice().sort((left, right) => left.id.localeCompare(right.id));
    }
    return normalized;
  }
  if (typeof value === 'object' && value !== null) {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalize(object[key])]),
    );
  }
  return value;
}

/**
 * Returns a key-sorted, definition-ID-sorted value for reproducible bundle hashing.
 * Hashing itself stays in the Node CLI so this package remains usable by edge runtimes.
 */
export function canonicalizeContentBundle(bundle: ContentBundle): unknown {
  return canonicalize(bundle);
}

export function canonicalContentJson(bundle: ContentBundle): string {
  return JSON.stringify(canonicalizeContentBundle(bundle));
}

export function validateContentBundle(input: unknown): ContentValidationReport {
  const parsed = contentBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(issueFromZod),
      warnings: [],
    };
  }

  const bundle = parsed.data;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const definitions = new Map<string, string>();
  const addError = (path: string, message: string) => errors.push({ path, message });
  const addWarning = (path: string, message: string) => warnings.push({ path, message });

  const collections: ReadonlyArray<readonly [string, readonly { readonly id: string }[]]> = [
    ['assets', bundle.assets],
    ['characters', bundle.characters],
    ['zones', bundle.zones],
    ['routes', bundle.routes],
    ['nodes', bundle.nodes],
    ['enemies', bundle.enemies],
    ['commands', bundle.commands],
    ['items', bundle.items],
    ['affixes', bundle.affixes],
    ['cards', bundle.cards],
    ['recipes', bundle.recipes],
    ['codex', bundle.codex],
    ['quests', bundle.quests],
    ['dispatches', bundle.dispatches],
    ['dropTables', bundle.dropTables],
  ];
  for (const [collection, entries] of collections)
    registerDefinitions(definitions, errors, collection, entries);

  const hasDefinition = (id: string) => definitions.has(id);
  const requireReference = (id: string, path: string, expected: string) => {
    if (!hasDefinition(id)) addError(path, `${expected} reference ${id} does not exist`);
  };

  const defaultLocale = bundle.locales[bundle.defaultLocale];
  if (!defaultLocale) {
    addError('defaultLocale', `locale ${bundle.defaultLocale} is not present in locales`);
  }
  const requireLocalization = (key: string, path: string) => {
    if (!defaultLocale || !Object.prototype.hasOwnProperty.call(defaultLocale, key)) {
      addError(path, `localization key ${key} is missing from ${bundle.defaultLocale}`);
    }
  };

  for (const [locale, translations] of Object.entries(bundle.locales)) {
    if (Object.keys(translations).length === 0)
      addError(`locales.${locale}`, 'must contain at least one localization key');
  }

  bundle.assets.forEach((asset, index) => {
    const path = pathFor('assets', index);
    requireLocalization(asset.altTextKey, `${path}.altTextKey`);
    if (asset.path.startsWith('http://') || asset.path.startsWith('https://')) {
      addError(`${path}.path`, 'production assets must use repository paths, not external URLs');
    }
    if (asset.audience === 'general') {
      if (asset.generalFallbackId !== null)
        addError(`${path}.generalFallbackId`, 'general assets must use null fallback');
      if (asset.contentReview !== null)
        addError(`${path}.contentReview`, 'general assets do not need suggestive review metadata');
    } else {
      if (!asset.generalFallbackId)
        addError(`${path}.generalFallbackId`, 'suggestive assets require a general fallback');
      else {
        requireReference(
          asset.generalFallbackId,
          `${path}.generalFallbackId`,
          'general fallback asset',
        );
        const fallback = bundle.assets.find(
          (candidate) => candidate.id === asset.generalFallbackId,
        );
        if (fallback && fallback.audience !== 'general') {
          addError(`${path}.generalFallbackId`, 'fallback asset must have general audience');
        }
      }
      if (!asset.contentReview) {
        addError(`${path}.contentReview`, 'suggestive assets require review metadata');
      } else if (asset.contentReview.status === 'rejected') {
        addError(
          `${path}.contentReview.status`,
          'rejected suggestive assets cannot be included in a valid bundle',
        );
      } else if (asset.contentReview.status === 'pending') {
        addWarning(`${path}.contentReview.status`, 'suggestive asset review is still pending');
      }
      if (asset.contentReview?.notesKey)
        requireLocalization(asset.contentReview.notesKey, `${path}.contentReview.notesKey`);
    }
    if (asset.depictedCharacterId)
      requireReference(
        asset.depictedCharacterId,
        `${path}.depictedCharacterId`,
        'depicted character',
      );
  });

  bundle.characters.forEach((character, index) => {
    const path = pathFor('characters', index);
    requireLocalization(character.nameKey, `${path}.nameKey`);
    requireLocalization(character.roleKey, `${path}.roleKey`);
    requireLocalization(character.gameplayFunctionKey, `${path}.gameplayFunctionKey`);
    character.traitKeys.forEach((key, traitIndex) =>
      requireLocalization(key, `${path}.traitKeys[${traitIndex}]`),
    );
    character.prohibitedMotifKeys.forEach((key, motifIndex) =>
      requireLocalization(key, `${path}.prohibitedMotifKeys[${motifIndex}]`),
    );
    const generalAsset = bundle.assets.find((asset) => asset.id === character.generalAssetId);
    if (!generalAsset)
      addError(
        `${path}.generalAssetId`,
        `general asset ${character.generalAssetId} does not exist`,
      );
    else if (generalAsset.audience !== 'general')
      addError(`${path}.generalAssetId`, 'character generalAssetId must point to a general asset');
    if (character.suggestiveAssetId) {
      requireReference(
        character.suggestiveAssetId,
        `${path}.suggestiveAssetId`,
        'suggestive asset',
      );
      const suggestiveAsset = bundle.assets.find(
        (asset) => asset.id === character.suggestiveAssetId,
      );
      if (suggestiveAsset) {
        if (suggestiveAsset.audience !== 'suggestive')
          addError(
            `${path}.suggestiveAssetId`,
            'character suggestiveAssetId must point to a suggestive asset',
          );
        if (suggestiveAsset.generalFallbackId !== character.generalAssetId)
          addError(
            `${path}.suggestiveAssetId`,
            'suggestive asset must fall back to this character general asset',
          );
      }
    }
  });

  const routesById = new Map(bundle.routes.map((route) => [route.id, route]));
  const nodesById = new Map(bundle.nodes.map((node) => [node.id, node]));
  bundle.zones.forEach((zone, index) => {
    const path = pathFor('zones', index);
    requireLocalization(zone.nameKey, `${path}.nameKey`);
    requireLocalization(zone.summaryKey, `${path}.summaryKey`);
    zone.routeIds.forEach((routeId, routeIndex) => {
      requireReference(routeId, `${path}.routeIds[${routeIndex}]`, 'route');
      const route = routesById.get(routeId);
      if (route && route.zoneId !== zone.id)
        addError(
          `${path}.routeIds[${routeIndex}]`,
          `route ${routeId} belongs to ${route.zoneId}, not ${zone.id}`,
        );
    });
  });

  bundle.routes.forEach((route, index) => {
    const path = pathFor('routes', index);
    requireReference(route.zoneId, `${path}.zoneId`, 'zone');
    requireLocalization(route.nameKey, `${path}.nameKey`);
    requireLocalization(route.descriptionKey, `${path}.descriptionKey`);
    requireReference(route.entryNodeId, `${path}.entryNodeId`, 'entry node');
    route.terminalNodeIds.forEach((nodeId, nodeIndex) =>
      requireReference(nodeId, `${path}.terminalNodeIds[${nodeIndex}]`, 'terminal node'),
    );
    route.nodeIds.forEach((nodeId, nodeIndex) => {
      requireReference(nodeId, `${path}.nodeIds[${nodeIndex}]`, 'route node');
      const node = nodesById.get(nodeId);
      if (node && node.routeId !== route.id)
        addError(
          `${path}.nodeIds[${nodeIndex}]`,
          `node ${nodeId} belongs to ${node.routeId}, not ${route.id}`,
        );
    });

    const routeNodeIds = new Set(route.nodeIds);
    const visited = new Set<string>();
    const queue = [route.entryNodeId];
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId || visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = nodesById.get(nodeId);
      if (!node) continue;
      if (!routeNodeIds.has(nodeId))
        addError(`${path}.entryNodeId`, `reachable node ${nodeId} is not listed in nodeIds`);
      node.nextNodeIds.forEach((nextNodeId) => {
        if (!routeNodeIds.has(nextNodeId))
          addError(
            `${path}.nodeIds`,
            `node ${nodeId} points outside route nodeIds to ${nextNodeId}`,
          );
        if (!visited.has(nextNodeId)) queue.push(nextNodeId);
      });
    }
    route.nodeIds.forEach((nodeId, nodeIndex) => {
      if (!visited.has(nodeId))
        addError(
          `${path}.nodeIds[${nodeIndex}]`,
          `node ${nodeId} is unreachable from entryNodeId ${route.entryNodeId}`,
        );
    });
    route.terminalNodeIds.forEach((nodeId, terminalIndex) => {
      const node = nodesById.get(nodeId);
      if (node && node.type !== 'exit')
        addError(
          `${path}.terminalNodeIds[${terminalIndex}]`,
          `terminal node ${nodeId} must have type exit`,
        );
    });
  });

  bundle.nodes.forEach((node, index) => {
    const path = pathFor('nodes', index);
    requireReference(node.routeId, `${path}.routeId`, 'route');
    if (node.type === 'exit' && node.nextNodeIds.length > 0)
      addError(`${path}.nextNodeIds`, 'exit nodes cannot have outgoing edges');
    if (node.type !== 'exit' && node.nextNodeIds.length === 0)
      addError(`${path}.nextNodeIds`, `${node.type} nodes need at least one outgoing edge`);
    node.nextNodeIds.forEach((nodeId, nextIndex) =>
      requireReference(nodeId, `${path}.nextNodeIds[${nextIndex}]`, 'next node'),
    );
    node.commandIds.forEach((commandId, commandIndex) =>
      requireReference(commandId, `${path}.commandIds[${commandIndex}]`, 'command'),
    );
    node.enemyIds.forEach((enemyId, enemyIndex) =>
      requireReference(enemyId, `${path}.enemyIds[${enemyIndex}]`, 'enemy'),
    );
    if (node.dropTableId) requireReference(node.dropTableId, `${path}.dropTableId`, 'drop table');
    if (node.textKey) requireLocalization(node.textKey, `${path}.textKey`);
  });

  bundle.enemies.forEach((enemy, index) => {
    const path = pathFor('enemies', index);
    requireLocalization(enemy.nameKey, `${path}.nameKey`);
    requireReference(enemy.dropTableId, `${path}.dropTableId`, 'drop table');
  });
  bundle.commands.forEach((command, index) => {
    const path = pathFor('commands', index);
    requireLocalization(command.nameKey, `${path}.nameKey`);
    requireLocalization(command.descriptionKey, `${path}.descriptionKey`);
  });
  bundle.items.forEach((item, index) => {
    const path = pathFor('items', index);
    requireLocalization(item.nameKey, `${path}.nameKey`);
    requireLocalization(item.descriptionKey, `${path}.descriptionKey`);
  });
  const affixIds = new Set(bundle.affixes.map((affix) => affix.id));
  bundle.affixes.forEach((affix, index) => {
    const path = pathFor('affixes', index);
    requireLocalization(affix.nameKey, `${path}.nameKey`);
    affix.conflicts.forEach((conflictId, conflictIndex) => {
      if (!affixIds.has(conflictId))
        addError(
          `${path}.conflicts[${conflictIndex}]`,
          `conflicting affix ${conflictId} does not exist`,
        );
      if (conflictId === affix.id)
        addError(`${path}.conflicts[${conflictIndex}]`, 'an affix cannot conflict with itself');
      const conflict = bundle.affixes.find((candidate) => candidate.id === conflictId);
      if (conflict && !conflict.conflicts.includes(affix.id))
        addError(
          `${path}.conflicts[${conflictIndex}]`,
          `conflict must be reciprocal in ${conflictId}.conflicts`,
        );
    });
    const tierNumbers = affix.tiers.map((tier) => tier.tier);
    if (!uniqueArray(tierNumbers)) addError(`${path}.tiers`, 'tier numbers must be unique');
    affix.tiers.forEach((tier, tierIndex) => {
      if (tier.minValue > tier.maxValue)
        addError(`${path}.tiers[${tierIndex}]`, 'minValue cannot exceed maxValue');
      if (tier.budget > affix.maximumBudget)
        addError(
          `${path}.tiers[${tierIndex}].budget`,
          `budget cannot exceed maximumBudget ${affix.maximumBudget}`,
        );
    });
  });
  bundle.cards.forEach((card, index) => {
    const path = pathFor('cards', index);
    requireLocalization(card.nameKey, `${path}.nameKey`);
    requireLocalization(card.descriptionKey, `${path}.descriptionKey`);
    if (card.characterId)
      requireReference(card.characterId, `${path}.characterId`, 'card character');
    requireReference(card.generalAssetId, `${path}.generalAssetId`, 'card general asset');
    if (card.suggestiveAssetId)
      requireReference(
        card.suggestiveAssetId,
        `${path}.suggestiveAssetId`,
        'card suggestive asset',
      );
  });
  const itemIds = new Set(bundle.items.map((item) => item.id));
  bundle.recipes.forEach((recipe, index) => {
    const path = pathFor('recipes', index);
    requireLocalization(recipe.nameKey, `${path}.nameKey`);
    requireLocalization(recipe.descriptionKey, `${path}.descriptionKey`);
    requireReference(recipe.outputItemId, `${path}.outputItemId`, 'recipe output item');
    recipe.inputs.forEach((input, inputIndex) => {
      if (!itemIds.has(input.resourceId) && !input.resourceId.startsWith('material.')) {
        addError(
          `${path}.inputs[${inputIndex}].resourceId`,
          `resource ${input.resourceId} must be an item or a material.* ID`,
        );
      }
    });
  });
  bundle.codex.forEach((entry, index) => {
    const path = pathFor('codex', index);
    requireLocalization(entry.titleKey, `${path}.titleKey`);
    requireLocalization(entry.bodyKey, `${path}.bodyKey`);
    entry.relatedIds.forEach((relatedId, relatedIndex) =>
      requireReference(
        relatedId,
        `${path}.relatedIds[${relatedIndex}]`,
        'codex related definition',
      ),
    );
  });
  bundle.quests.forEach((quest, index) => {
    const path = pathFor('quests', index);
    requireLocalization(quest.nameKey, `${path}.nameKey`);
    requireLocalization(quest.descriptionKey, `${path}.descriptionKey`);
    requireReference(quest.zoneId, `${path}.zoneId`, 'quest zone');
    requireReference(quest.routeId, `${path}.routeId`, 'quest route');
    if (quest.codexId) requireReference(quest.codexId, `${path}.codexId`, 'quest codex');
    quest.rewardItemIds.forEach((itemId, itemIndex) =>
      requireReference(itemId, `${path}.rewardItemIds[${itemIndex}]`, 'quest reward item'),
    );
    quest.steps.forEach((step, stepIndex) => {
      requireLocalization(step.textKey, `${path}.steps[${stepIndex}].textKey`);
      requireReference(step.targetId, `${path}.steps[${stepIndex}].targetId`, 'quest target');
    });
  });
  bundle.dispatches.forEach((dispatch, index) => {
    const path = pathFor('dispatches', index);
    requireLocalization(dispatch.nameKey, `${path}.nameKey`);
    requireLocalization(dispatch.descriptionKey, `${path}.descriptionKey`);
    requireReference(dispatch.routeId, `${path}.routeId`, 'dispatch route');
    requireReference(
      dispatch.rewardDropTableId,
      `${path}.rewardDropTableId`,
      'dispatch reward drop table',
    );
    if (dispatch.codexId) requireReference(dispatch.codexId, `${path}.codexId`, 'dispatch codex');
  });
  bundle.dropTables.forEach((table, index) => {
    const path = pathFor('dropTables', index);
    requireLocalization(table.nameKey, `${path}.nameKey`);
    const totalChance =
      table.entries.reduce((sum, entry) => sum + entry.chance, 0) + table.noDropChance;
    if (Math.abs(totalChance - 1) > 1e-9)
      addError(
        `${path}.entries`,
        `drop probabilities must total exactly 1.0 including noDropChance; received ${totalChance}`,
      );
    table.entries.forEach((entry, entryIndex) => {
      requireReference(entry.itemId, `${path}.entries[${entryIndex}].itemId`, 'drop item');
      if (entry.minQuantity > entry.maxQuantity)
        addError(`${path}.entries[${entryIndex}]`, 'minQuantity cannot exceed maxQuantity');
    });
  });

  if (
    compareVersions(
      bundle.compatibility.minimumRulesetVersion,
      bundle.compatibility.maximumRulesetVersion,
    ) > 0
  ) {
    addError('compatibility', 'minimumRulesetVersion cannot exceed maximumRulesetVersion');
  }
  if (
    compareVersions(bundle.rulesetVersion, bundle.compatibility.minimumRulesetVersion) < 0 ||
    compareVersions(bundle.rulesetVersion, bundle.compatibility.maximumRulesetVersion) > 0
  ) {
    addError('rulesetVersion', 'rulesetVersion must be within the declared compatibility range');
  }

  return { valid: errors.length === 0, errors, warnings, bundle };
}

export function formatValidationIssues(issues: readonly ValidationIssue[]): string {
  return issues.map((issue) => `- ${issue.path}: ${issue.message}`).join('\n');
}

export function parseContentBundle(input: unknown): ContentBundle {
  const report = validateContentBundle(input);
  if (!report.valid || !report.bundle) {
    throw new Error(`Invalid content bundle:\n${formatValidationIssues(report.errors)}`);
  }
  return report.bundle;
}
