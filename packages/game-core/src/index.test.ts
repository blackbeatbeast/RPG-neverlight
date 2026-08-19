import { describe, expect, it } from 'vitest';

import {
  COMBAT_LIMITS,
  COMBAT_RULESET_VERSION,
  CombatInputError,
  ENEMY_PATTERN_SPECS,
  createCombatState,
  calculateSalvage,
  deriveEquipmentStats,
  lootBoundsReport,
  resolveLootDrop,
  resolveCombat,
  sampleDeterministicValue,
  stableStringify,
} from './index.js';

describe('sampleDeterministicValue', () => {
  it('returns the same result for the same seed', () => {
    const first = sampleDeterministicValue(42);
    const second = sampleDeterministicValue(42);

    expect(first).toEqual({ route: 'north', roll: 252, seed: 42 });
    expect(first).toEqual(second);
  });

  it('rejects a non-integer seed', () => {
    expect(() => sampleDeterministicValue(Number.NaN)).toThrow(RangeError);
  });
});

describe('resolveCombat', () => {
  it('returns byte-stable state and structured events for the same input', () => {
    const input = {
      commands: [
        { type: 'guard' as const },
        { targetId: 'enemy.heavy-telegraph.1', type: 'strike' as const },
      ],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 42,
      state: createCombatState('heavy-telegraph'),
    };
    const before = stableStringify(input.state);
    const first = resolveCombat(input);
    const second = resolveCombat(input);

    expect(stableStringify(first)).toBe(stableStringify(second));
    expect(first.inputStateHash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(first.outputStateHash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(first.resolutionHash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(first.events.map((event) => event.type)).toContain('telegraph');
    expect(first.events.map((event) => event.type)).toContain('guard_changed');
    expect(first.events.map((event) => event.type)).toContain('damage');
    expect(stableStringify(input.state)).toBe(before);
  });

  it('rejects a queue above the three-command cap', () => {
    expect(() =>
      resolveCombat({
        commands: [{ type: 'guard' }, { type: 'guard' }, { type: 'guard' }, { type: 'guard' }],
        rulesetVersion: COMBAT_RULESET_VERSION,
        seed: 1,
        state: createCombatState(),
      }),
    ).toThrow(CombatInputError);
  });

  it('emits predictable rejection events for invalid target, over-cost, and cooldown commands', () => {
    const invalidTarget = resolveCombat({
      commands: [{ targetId: 'enemy.missing', type: 'strike' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 2,
      state: createCombatState('warded-guardian'),
    });
    const overCostState = createCombatState('warded-guardian');
    overCostState.player.focus = 1;
    const overCost = resolveCombat({
      commands: [{ skillId: 'ward-break', targetId: 'enemy.warded-guardian.1', type: 'skill' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 2,
      state: overCostState,
    });
    const cooldownState = createCombatState('warded-guardian');
    cooldownState.cooldowns['ward-break'] = 2;
    const cooldown = resolveCombat({
      commands: [{ skillId: 'ward-break', targetId: 'enemy.warded-guardian.1', type: 'skill' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 2,
      state: cooldownState,
    });

    expect(
      invalidTarget.events.find((event) => event.type === 'command_rejected')?.data.reason,
    ).toBe('invalid-target');
    expect(overCost.events.find((event) => event.type === 'command_rejected')?.data.reason).toBe(
      'over-cost',
    );
    expect(cooldown.events.find((event) => event.type === 'command_rejected')?.data.reason).toBe(
      'cooldown',
    );
  });

  it('rejects a skill when focus is insufficient without changing focus', () => {
    const state = createCombatState('heavy-telegraph');
    state.player.focus = 1;
    const result = resolveCombat({
      commands: [{ skillId: 'piercing-lunge', targetId: 'enemy.heavy-telegraph.1', type: 'skill' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 3,
      state,
    });

    expect(result.events.find((event) => event.type === 'command_rejected')?.data.reason).toBe(
      'over-cost',
    );
    expect(result.state.player.focus).toBe(1);
  });

  it('keeps damage, status stacks, events, and enemy count bounded', () => {
    const result = resolveCombat({
      commands: [
        { skillId: 'ward-break', targetId: 'enemy.warded-guardian.1', type: 'skill' },
        { type: 'guard' },
        { type: 'guard' },
      ],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 4,
      state: createCombatState('warded-guardian'),
    });
    const damage = result.events
      .filter((event) => event.type === 'damage')
      .map((event) => event.data.amount)
      .filter((amount): amount is number => typeof amount === 'number');

    expect(result.events.length).toBeLessThanOrEqual(COMBAT_LIMITS.maxEvents);
    expect(result.state.enemies.length).toBeLessThanOrEqual(COMBAT_LIMITS.maxEnemies);
    expect(damage.every((amount) => amount <= COMBAT_LIMITS.maxDamagePerAction)).toBe(true);
    expect(result.state.player.statuses.length).toBeLessThanOrEqual(COMBAT_LIMITS.maxStatusKinds);
    expect(
      result.state.enemies.every((enemy) => enemy.statuses.length <= COMBAT_LIMITS.maxStatusKinds),
    ).toBe(true);
  });

  it('supports deterministic flee, item recovery, victory, and defeat outcomes', () => {
    const flee = resolveCombat({
      commands: [{ type: 'flee' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 1,
      state: createCombatState('heavy-telegraph'),
    });
    const itemState = createCombatState('retaliator');
    itemState.player.vitality = 20;
    const item = resolveCombat({
      commands: [{ itemId: 'field-draught', targetId: 'player', type: 'item' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 6,
      state: itemState,
    });
    const victoryState = createCombatState('warded-guardian');
    victoryState.enemies[0]!.vitality = 1;
    const victory = resolveCombat({
      commands: [{ targetId: 'enemy.warded-guardian.1', type: 'strike' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 7,
      state: victoryState,
    });
    const defeatState = createCombatState('heavy-telegraph');
    defeatState.player.vitality = 1;
    const defeat = resolveCombat({
      commands: [{ stance: 'balanced', type: 'shift' }],
      rulesetVersion: COMBAT_RULESET_VERSION,
      seed: 8,
      state: defeatState,
    });

    expect(flee.events.some((event) => event.type === 'flee_result')).toBe(true);
    expect(flee.state.outcome).toBe('fled');
    expect(item.state.player.inventory['field-draught']).toBe(0);
    expect(item.state.player.vitality).toBeGreaterThan(20);
    expect(victory.state.outcome).toBe('victory');
    expect(defeat.state.outcome).toBe('defeat');
  });

  it('exposes three readable enemy patterns with different counterplay', () => {
    const patterns = Object.keys(ENEMY_PATTERN_SPECS) as Array<keyof typeof ENEMY_PATTERN_SPECS>;
    const counterplay = patterns.map((pattern) => {
      const command =
        pattern === 'warded-guardian'
          ? {
              skillId: 'ward-break' as const,
              targetId: 'enemy.warded-guardian.1',
              type: 'skill' as const,
            }
          : pattern === 'retaliator'
            ? { targetId: 'enemy.retaliator.1', type: 'strike' as const }
            : { type: 'guard' as const };
      const result = resolveCombat({
        commands: [command],
        rulesetVersion: COMBAT_RULESET_VERSION,
        seed: 5,
        state: createCombatState(pattern),
      });
      return result.events.find((event) => event.type === 'telegraph')?.data.counterplay;
    });

    expect(patterns).toHaveLength(3);
    expect(new Set(counterplay).size).toBe(3);
    expect(counterplay).toEqual(['guard', 'pierce', 'avoid']);
  });
});

describe('resolveLootDrop', () => {
  it('replays the same bounded item from the same seed and content version', () => {
    const options = {
      contentVersion: '0.1.0',
      itemId: 'item-test-1',
      seed: 0x1234,
      sourceRef: 'glass-marsh.cache',
    };
    const first = resolveLootDrop(options);
    const second = resolveLootDrop(options);

    expect(first).toEqual(second);
    const bounds = lootBoundsReport(first.item);
    expect(bounds.affixCount).toBeLessThanOrEqual(bounds.maxAffixes);
    expect(bounds.affixBudget).toBeLessThanOrEqual(bounds.maxBudget);
    expect(bounds.qualityInRange).toBe(true);
    expect(first.item.provenance.seedHash).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
  });

  it('keeps rare drops explicit and derives equipment stats from authoritative items', () => {
    const rare = resolveLootDrop({
      itemId: 'item-rare-1',
      minimumRarity: 'rare',
      seed: 7,
      sourceRef: 'glass-marsh.boss',
    }).item;
    const derived = deriveEquipmentStats(
      {
        armor: 0,
        attack: 0,
        focus: 3,
        guard: 0,
        luck: 0,
        maxFocus: 3,
        maxVitality: 10,
        speed: 5,
        vitality: 10,
        ward: 0,
      },
      [{ ...rare, location: 'equipment', equipmentSlot: rare.slot }],
    );

    expect(['rare', 'unique', 'relic']).toContain(rare.rarity);
    expect(derived.explanations).toHaveLength(1);
    expect(derived.attack + derived.armor + derived.ward).toBeGreaterThan(0);
    expect(calculateSalvage(rare).quantity).toBeGreaterThanOrEqual(4);
  });

  it('keeps 10,000 fixed seeds inside the declared quality and affix caps', () => {
    for (let seed = 0; seed < 10_000; seed += 1) {
      const item = resolveLootDrop({
        itemId: `item-${seed}`,
        seed,
        sourceRef: 'simulation.fixture',
      }).item;
      const bounds = lootBoundsReport(item);
      expect(bounds.affixCount).toBeLessThanOrEqual(bounds.maxAffixes);
      expect(bounds.affixBudget).toBeLessThanOrEqual(bounds.maxBudget);
      expect(bounds.qualityInRange).toBe(true);
    }
  });
});
