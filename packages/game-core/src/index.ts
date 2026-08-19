const ROUTES = ['north', 'east', 'south', 'west'] as const;

export type SampleRoute = (typeof ROUTES)[number];

export interface DeterministicSample {
  seed: number;
  roll: number;
  route: SampleRoute;
}

export const COMBAT_RULESET_VERSION = '1.0.0' as const;

export const COMBAT_LIMITS = {
  maxCommands: 3,
  maxEnemies: 3,
  maxEvents: 128,
  maxDamagePerAction: 100,
  maxStatusKinds: 4,
  maxStatusStacks: 3,
  maxProcsPerTurn: 8,
  maxVitality: 1_000,
  maxFocus: 100,
  maxGuard: 100,
} as const;

export type CombatOutcome = 'ongoing' | 'victory' | 'defeat' | 'fled';
export type Stance = 'balanced' | 'aggressive' | 'defensive';
export type StatusId = 'bleeding' | 'exposed' | 'stunned';
export type SkillId = 'piercing-lunge' | 'ward-break';
export type ItemId = 'field-draught';
export type EnemyPattern = 'heavy-telegraph' | 'warded-guardian' | 'retaliator';

export interface CombatStatus {
  duration: number;
  id: StatusId;
  potency: number;
  stacks: number;
}

interface CombatantBase {
  armor: number;
  focus: number;
  guard: number;
  id: string;
  maxFocus: number;
  maxVitality: number;
  name: string;
  power: number;
  speed: number;
  statuses: CombatStatus[];
  vitality: number;
  ward: number;
}

export interface PlayerCombatant extends CombatantBase {
  inventory: Record<ItemId, number>;
  kind: 'player';
  stance: Stance;
}

export interface EnemyCombatant extends CombatantBase {
  kind: 'enemy';
  pattern: EnemyPattern;
}

export interface EnemyTelegraph {
  attackId: string;
  counterplay: 'guard' | 'pierce' | 'avoid';
  enemyId: string;
  intensity: 'high' | 'low' | 'medium';
  priority: number;
}

export interface CombatState {
  cooldowns: Record<SkillId, number>;
  enemies: EnemyCombatant[];
  outcome: CombatOutcome;
  player: PlayerCombatant;
  telegraphs: EnemyTelegraph[];
  turn: number;
}

export type CombatCommand =
  | { targetId: string; type: 'strike' }
  | { type: 'guard' }
  | { skillId: SkillId; targetId: string; type: 'skill' }
  | { itemId: ItemId; targetId: string; type: 'item' }
  | { stance: Stance; type: 'shift' }
  | { type: 'flee' };

export interface CombatInput {
  commands: readonly CombatCommand[];
  rulesetVersion: string;
  seed: number;
  state: CombatState;
}

export type CombatEventType =
  | 'resolution_started'
  | 'turn_started'
  | 'status_tick'
  | 'telegraph'
  | 'command_accepted'
  | 'command_rejected'
  | 'command_executed'
  | 'damage'
  | 'guard_changed'
  | 'focus_changed'
  | 'healing'
  | 'status_applied'
  | 'status_capped'
  | 'cooldown_changed'
  | 'enemy_action'
  | 'flee_result'
  | 'command_cancelled'
  | 'turn_ended'
  | 'outcome';

export interface CombatEvent {
  data: Record<string, unknown>;
  turn: number;
  type: CombatEventType;
}

export interface CombatResolution {
  commands: CombatCommand[];
  events: CombatEvent[];
  inputStateHash: string;
  outputStateHash: string;
  resolutionHash: string;
  rulesetVersion: string;
  seed: number;
  state: CombatState;
}

export interface EnemyPatternSpec {
  counterplay: string;
  description: string;
  pattern: EnemyPattern;
  telegraph: string;
}

export const ENEMY_PATTERN_SPECS: Record<EnemyPattern, EnemyPatternSpec> = {
  'heavy-telegraph': {
    counterplay: 'Guard before the heavy strike or flee from the encounter.',
    description: 'A slow attacker announces a high-damage blow.',
    pattern: 'heavy-telegraph',
    telegraph: 'heavy-charge',
  },
  'warded-guardian': {
    counterplay: 'Use piercing-lunge or ward-break instead of repeating plain strikes.',
    description: 'A warded defender rewards piercing damage and punishes attrition.',
    pattern: 'warded-guardian',
    telegraph: 'ward-bash',
  },
  retaliator: {
    counterplay: 'Guard or shift when the enemy reads a direct attack.',
    description: 'A reactive enemy punishes predictable strike commands.',
    pattern: 'retaliator',
    telegraph: 'retaliation',
  },
};

interface SkillDefinition {
  cooldown: number;
  damage: number;
  focusCost: number;
  id: SkillId;
  priority: number;
}

const SKILLS: Record<SkillId, SkillDefinition> = {
  'piercing-lunge': {
    cooldown: 2,
    damage: 7,
    focusCost: 2,
    id: 'piercing-lunge',
    priority: 9,
  },
  'ward-break': {
    cooldown: 2,
    damage: 5,
    focusCost: 2,
    id: 'ward-break',
    priority: 8,
  },
};

export class CombatInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CombatInputError';
  }
}

/**
 * Returns a tiny deterministic sample retained from the bootstrap package.
 * The function has no I/O, clock, environment, or global randomness dependency.
 */
export function sampleDeterministicValue(seed: number): DeterministicSample {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError('The seed must be a safe integer.');
  }

  let state = seed >>> 0;
  const nextUnit = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };

  const roll = Math.floor(nextUnit() * 1_000);
  const route = ROUTES[Math.floor(nextUnit() * ROUTES.length)] ?? ROUTES[0];

  return { route, roll, seed };
}

export class DeterministicPrng {
  private state: number;

  constructor(seed: number) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
      throw new RangeError('The combat seed must be an unsigned safe integer.');
    }
    this.state = seed >>> 0 || 0x6d2b_79f5;
  }

  nextUint32(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError('The PRNG bound must be a positive safe integer.');
    }
    return Math.floor((this.nextUint32() / 4_294_967_296) * maxExclusive);
  }
}

export function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Cannot hash a non-finite number.');
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError('Cannot hash an unsupported value.');
}

export function hashStable(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 0x811c_9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function emptyStatuses(): CombatStatus[] {
  return [];
}

function playerDefaults(): PlayerCombatant {
  return {
    armor: 2,
    focus: 6,
    guard: 0,
    id: 'player',
    inventory: { 'field-draught': 1 },
    kind: 'player',
    maxFocus: 6,
    maxVitality: 40,
    name: 'Pathfinder',
    power: 6,
    speed: 8,
    stance: 'balanced',
    statuses: emptyStatuses(),
    vitality: 40,
    ward: 1,
  };
}

function enemyDefaults(pattern: EnemyPattern, index: number): EnemyCombatant {
  const values: Record<EnemyPattern, Omit<EnemyCombatant, 'id' | 'kind' | 'name' | 'pattern'>> = {
    'heavy-telegraph': {
      armor: 1,
      focus: 0,
      guard: 0,
      maxFocus: 0,
      maxVitality: 32,
      power: 11,
      speed: 5,
      statuses: emptyStatuses(),
      vitality: 32,
      ward: 0,
    },
    'warded-guardian': {
      armor: 2,
      focus: 0,
      guard: 2,
      maxFocus: 0,
      maxVitality: 30,
      power: 7,
      speed: 6,
      statuses: emptyStatuses(),
      vitality: 30,
      ward: 8,
    },
    retaliator: {
      armor: 1,
      focus: 0,
      guard: 0,
      maxFocus: 0,
      maxVitality: 28,
      power: 8,
      speed: 8,
      statuses: emptyStatuses(),
      vitality: 28,
      ward: 1,
    },
  };

  return {
    ...values[pattern],
    id: `enemy.${pattern}.${index + 1}`,
    kind: 'enemy',
    name: pattern,
    pattern,
  };
}

export function createCombatState(
  patterns: EnemyPattern | readonly EnemyPattern[] = 'heavy-telegraph',
): CombatState {
  const selected = Array.isArray(patterns) ? [...patterns] : [patterns];
  if (selected.length === 0 || selected.length > COMBAT_LIMITS.maxEnemies) {
    throw new CombatInputError(`Combat requires 1-${COMBAT_LIMITS.maxEnemies} enemies.`);
  }
  return {
    cooldowns: { 'piercing-lunge': 0, 'ward-break': 0 },
    enemies: selected.map((pattern, index) => enemyDefaults(pattern, index)),
    outcome: 'ongoing',
    player: playerDefaults(),
    telegraphs: [],
    turn: 1,
  };
}

function cloneStatus(status: CombatStatus): CombatStatus {
  return { ...status };
}

function clonePlayer(player: PlayerCombatant): PlayerCombatant {
  return {
    ...player,
    inventory: { ...player.inventory },
    statuses: player.statuses.map(cloneStatus),
  };
}

function cloneEnemy(enemy: EnemyCombatant): EnemyCombatant {
  return { ...enemy, statuses: enemy.statuses.map(cloneStatus) };
}

function cloneState(state: CombatState): CombatState {
  return {
    cooldowns: { ...state.cooldowns },
    enemies: state.enemies.map(cloneEnemy).sort((left, right) => left.id.localeCompare(right.id)),
    outcome: state.outcome,
    player: clonePlayer(state.player),
    telegraphs: state.telegraphs.map((telegraph) => ({ ...telegraph })),
    turn: state.turn,
  };
}

function assertInteger(value: number, label: string, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new CombatInputError(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
}

function validateState(state: CombatState): void {
  if (!['ongoing', 'victory', 'defeat', 'fled'].includes(state.outcome)) {
    throw new CombatInputError('Combat outcome is invalid.');
  }
  assertInteger(state.turn, 'Combat turn', 1, Number.MAX_SAFE_INTEGER);
  if (state.enemies.length === 0 || state.enemies.length > COMBAT_LIMITS.maxEnemies) {
    throw new CombatInputError(`Combat requires 1-${COMBAT_LIMITS.maxEnemies} enemies.`);
  }
  const ids = new Set<string>();
  for (const actor of [state.player, ...state.enemies]) {
    if (!actor.id || ids.has(actor.id)) {
      throw new CombatInputError(`Duplicate or empty combatant ID: ${actor.id}`);
    }
    ids.add(actor.id);
    assertInteger(actor.vitality, `${actor.id} vitality`, 0, COMBAT_LIMITS.maxVitality);
    assertInteger(actor.maxVitality, `${actor.id} max vitality`, 1, COMBAT_LIMITS.maxVitality);
    assertInteger(actor.focus, `${actor.id} focus`, 0, COMBAT_LIMITS.maxFocus);
    assertInteger(actor.maxFocus, `${actor.id} max focus`, 0, COMBAT_LIMITS.maxFocus);
    assertInteger(actor.guard, `${actor.id} guard`, 0, COMBAT_LIMITS.maxGuard);
    assertInteger(actor.power, `${actor.id} power`, 0, COMBAT_LIMITS.maxDamagePerAction);
    assertInteger(actor.armor, `${actor.id} armor`, 0, COMBAT_LIMITS.maxDamagePerAction);
    assertInteger(actor.ward, `${actor.id} ward`, 0, COMBAT_LIMITS.maxDamagePerAction);
    assertInteger(actor.speed, `${actor.id} speed`, 0, COMBAT_LIMITS.maxDamagePerAction);
    if (actor.statuses.length > COMBAT_LIMITS.maxStatusKinds) {
      throw new CombatInputError(`${actor.id} has too many status kinds.`);
    }
    for (const status of actor.statuses) {
      assertInteger(status.duration, `${actor.id} status duration`, 1, 100);
      assertInteger(
        status.potency,
        `${actor.id} status potency`,
        0,
        COMBAT_LIMITS.maxDamagePerAction,
      );
      assertInteger(status.stacks, `${actor.id} status stacks`, 1, COMBAT_LIMITS.maxStatusStacks);
    }
  }
  for (const cooldown of Object.values(state.cooldowns)) {
    assertInteger(cooldown, 'Skill cooldown', 0, 100);
  }
}

function pushEvent(
  events: CombatEvent[],
  type: CombatEventType,
  turn: number,
  data: Record<string, unknown>,
): void {
  if (events.length >= COMBAT_LIMITS.maxEvents) {
    throw new CombatInputError('Combat event cap reached.');
  }
  events.push({ data, turn, type });
}

function aliveEnemies(state: CombatState): EnemyCombatant[] {
  return state.enemies.filter((enemy) => enemy.vitality > 0);
}

function findEnemy(state: CombatState, id: string): EnemyCombatant | undefined {
  return state.enemies.find((enemy) => enemy.id === id && enemy.vitality > 0);
}

function statusFor(actor: CombatantBase, id: StatusId): CombatStatus | undefined {
  return actor.statuses.find((status) => status.id === id);
}

function hasStatus(actor: CombatantBase, id: StatusId): boolean {
  return statusFor(actor, id) !== undefined;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

interface ProcBudget {
  remaining: number;
}

function applyStatus(
  target: CombatantBase,
  id: StatusId,
  duration: number,
  stacks: number,
  potency: number,
  turn: number,
  events: CombatEvent[],
  budget: ProcBudget,
): void {
  if (budget.remaining <= 0) {
    pushEvent(events, 'status_capped', turn, { id, reason: 'proc-cap', targetId: target.id });
    return;
  }
  budget.remaining -= 1;
  const current = statusFor(target, id);
  if (current) {
    current.duration = Math.max(current.duration, duration);
    current.stacks = Math.min(COMBAT_LIMITS.maxStatusStacks, current.stacks + stacks);
    current.potency = Math.max(current.potency, potency);
    pushEvent(events, 'status_applied', turn, {
      duration: current.duration,
      id,
      stacks: current.stacks,
      targetId: target.id,
    });
    return;
  }
  if (target.statuses.length >= COMBAT_LIMITS.maxStatusKinds) {
    pushEvent(events, 'status_capped', turn, {
      id,
      reason: 'status-kind-cap',
      targetId: target.id,
    });
    return;
  }
  const boundedStacks = Math.min(stacks, COMBAT_LIMITS.maxStatusStacks);
  target.statuses.push({ duration, id, potency, stacks: boundedStacks });
  target.statuses.sort((left, right) => left.id.localeCompare(right.id));
  pushEvent(events, 'status_applied', turn, {
    duration,
    id,
    stacks: boundedStacks,
    targetId: target.id,
  });
}

function applyDamage(
  target: CombatantBase,
  requested: number,
  sourceId: string,
  turn: number,
  events: CombatEvent[],
): number {
  const bounded = clamp(requested, 0, COMBAT_LIMITS.maxDamagePerAction);
  const absorbed = Math.min(target.guard, bounded);
  target.guard -= absorbed;
  const healthDamage = bounded - absorbed;
  target.vitality = Math.max(0, target.vitality - healthDamage);
  pushEvent(events, 'damage', turn, {
    absorbed,
    amount: healthDamage,
    sourceId,
    targetId: target.id,
    targetVitality: target.vitality,
  });
  return healthDamage;
}

function calculateDamage(
  raw: number,
  target: CombatantBase,
  mitigation: number,
  ignoreMitigation: number,
): number {
  const exposed = hasStatus(target, 'exposed');
  const amplified = exposed ? Math.floor((raw * 110) / 100) : raw;
  return clamp(
    amplified - Math.max(0, mitigation - ignoreMitigation),
    1,
    COMBAT_LIMITS.maxDamagePerAction,
  );
}

function effectivePower(player: PlayerCombatant): number {
  return player.power + (player.stance === 'aggressive' ? 2 : 0);
}

function effectiveArmor(player: PlayerCombatant): number {
  return player.armor + (player.stance === 'defensive' ? 2 : 0);
}

function changeFocus(
  player: PlayerCombatant,
  amount: number,
  turn: number,
  events: CombatEvent[],
): void {
  const before = player.focus;
  player.focus = clamp(player.focus + amount, 0, player.maxFocus);
  if (before !== player.focus) {
    pushEvent(events, 'focus_changed', turn, { after: player.focus, before, playerId: player.id });
  }
}

function changeGuard(
  actor: CombatantBase,
  amount: number,
  turn: number,
  events: CombatEvent[],
): void {
  const before = actor.guard;
  actor.guard = clamp(actor.guard + amount, 0, COMBAT_LIMITS.maxGuard);
  pushEvent(events, 'guard_changed', turn, { after: actor.guard, before, actorId: actor.id });
}

function healPlayer(
  player: PlayerCombatant,
  amount: number,
  turn: number,
  events: CombatEvent[],
): void {
  const before = player.vitality;
  player.vitality = clamp(player.vitality + amount, 0, player.maxVitality);
  pushEvent(events, 'healing', turn, {
    after: player.vitality,
    amount: player.vitality - before,
    before,
  });
}

function tickStatuses(actor: CombatantBase, turn: number, events: CombatEvent[]): void {
  const nextStatuses: CombatStatus[] = [];
  for (const status of actor.statuses) {
    if (status.id === 'bleeding' && actor.vitality > 0) {
      applyDamage(actor, status.potency * status.stacks, 'status.bleeding', turn, events);
      pushEvent(events, 'status_tick', turn, { id: status.id, targetId: actor.id });
    }
    const remaining = status.duration - 1;
    if (remaining > 0) nextStatuses.push({ ...status, duration: remaining });
  }
  actor.statuses = nextStatuses;
}

interface EnemyPlan {
  actionId: string;
  counterplay: EnemyTelegraph['counterplay'];
  damage: number;
  ignoreMitigation: number;
  intensity: EnemyTelegraph['intensity'];
  priority: number;
  status: StatusId | 'none';
}

function planEnemyAction(
  enemy: EnemyCombatant,
  playerCommand: CombatCommand,
  rng: DeterministicPrng,
): EnemyPlan {
  if (hasStatus(enemy, 'stunned')) {
    return {
      actionId: 'stunned',
      counterplay: 'avoid',
      damage: 0,
      ignoreMitigation: 0,
      intensity: 'low',
      priority: 0,
      status: 'none',
    };
  }
  switch (enemy.pattern) {
    case 'heavy-telegraph':
      if (rng.nextInt(100) < 75) {
        return {
          actionId: 'heavy-strike',
          counterplay: 'guard',
          damage: enemy.power + 5,
          ignoreMitigation: 0,
          intensity: 'high',
          priority: 4,
          status: 'bleeding',
        };
      }
      return {
        actionId: 'heavy-probe',
        counterplay: 'avoid',
        damage: enemy.power,
        ignoreMitigation: 0,
        intensity: 'low',
        priority: 6,
        status: 'none',
      };
    case 'warded-guardian':
      return {
        actionId: 'ward-bash',
        counterplay: 'pierce',
        damage: enemy.power + 2,
        ignoreMitigation: 2,
        intensity: 'medium',
        priority: 8,
        status: 'exposed',
      };
    case 'retaliator':
      if (
        (playerCommand.type === 'strike' || playerCommand.type === 'skill') &&
        rng.nextInt(100) < 80
      ) {
        return {
          actionId: 'retaliate',
          counterplay: 'avoid',
          damage: enemy.power + 3,
          ignoreMitigation: 0,
          intensity: 'high',
          priority: 11,
          status: 'bleeding',
        };
      }
      return {
        actionId: 'retaliator-probe',
        counterplay: 'guard',
        damage: enemy.power - 2,
        ignoreMitigation: 0,
        intensity: 'low',
        priority: 6,
        status: 'none',
      };
  }
}

function commandPriority(command: CombatCommand): number {
  switch (command.type) {
    case 'flee':
      return 12;
    case 'strike':
      return 10;
    case 'skill':
      return SKILLS[command.skillId].priority;
    case 'shift':
      return 9;
    case 'guard':
      return 7;
    case 'item':
      return 6;
  }
}

function commandTarget(state: CombatState, command: CombatCommand): EnemyCombatant | undefined {
  if (command.type !== 'strike' && command.type !== 'skill') return undefined;
  return findEnemy(state, command.targetId);
}

function invalidCommandReason(state: CombatState, command: CombatCommand): string | undefined {
  if (state.outcome !== 'ongoing') return 'combat-ended';
  switch (command.type) {
    case 'strike':
      return commandTarget(state, command) ? undefined : 'invalid-target';
    case 'guard':
      return undefined;
    case 'skill': {
      const skill = SKILLS[command.skillId];
      if (!skill) return 'unknown-skill';
      if (!commandTarget(state, command)) return 'invalid-target';
      if (state.player.focus < skill.focusCost) return 'over-cost';
      if (state.cooldowns[command.skillId] > 0) return 'cooldown';
      return undefined;
    }
    case 'item':
      if (command.itemId !== 'field-draught') return 'unknown-item';
      if (command.targetId !== state.player.id) return 'invalid-target';
      return state.player.inventory[command.itemId] > 0 ? undefined : 'item-unavailable';
    case 'shift':
      return ['balanced', 'aggressive', 'defensive'].includes(command.stance)
        ? undefined
        : 'invalid-stance';
    case 'flee':
      return aliveEnemies(state).length > 0 ? undefined : 'no-encounter';
    default:
      return 'unknown-command';
  }
}

function executePlayerCommand(
  state: CombatState,
  command: CombatCommand,
  seedRng: DeterministicPrng,
  turn: number,
  events: CombatEvent[],
  budget: ProcBudget,
): void {
  pushEvent(events, 'command_executed', turn, { command });
  switch (command.type) {
    case 'strike': {
      const target = commandTarget(state, command);
      if (!target) return;
      const damage = calculateDamage(effectivePower(state.player), target, target.armor, 0);
      applyDamage(target, damage, state.player.id, turn, events);
      changeFocus(state.player, 1, turn, events);
      break;
    }
    case 'guard':
      changeGuard(state.player, 7, turn, events);
      changeFocus(state.player, 1, turn, events);
      break;
    case 'skill': {
      const target = commandTarget(state, command);
      const skill = SKILLS[command.skillId];
      if (!target || !skill) return;
      changeFocus(state.player, -skill.focusCost, turn, events);
      state.cooldowns[command.skillId] = skill.cooldown;
      pushEvent(events, 'cooldown_changed', turn, {
        cooldown: skill.cooldown,
        skillId: skill.id,
      });
      const ignore = command.skillId === 'piercing-lunge' ? target.armor : target.ward;
      const mitigation = command.skillId === 'piercing-lunge' ? target.armor : target.ward;
      const damage = calculateDamage(
        effectivePower(state.player) + skill.damage,
        target,
        mitigation,
        ignore,
      );
      applyDamage(target, damage, state.player.id, turn, events);
      applyStatus(target, 'exposed', 2, 1, 0, turn, events, budget);
      if (command.skillId === 'ward-break' && target.ward > 0) {
        applyStatus(target, 'stunned', 2, 1, 0, turn, events, budget);
      }
      break;
    }
    case 'item':
      state.player.inventory[command.itemId] -= 1;
      healPlayer(state.player, 10, turn, events);
      pushEvent(events, 'command_accepted', turn, {
        itemId: command.itemId,
        targetId: command.targetId,
      });
      break;
    case 'shift':
      state.player.stance = command.stance;
      pushEvent(events, 'command_accepted', turn, { stance: command.stance });
      break;
    case 'flee': {
      const enemies = aliveEnemies(state);
      const enemySpeed = enemies.reduce((sum, enemy) => sum + enemy.speed, 0) / enemies.length;
      const chance = clamp(35 + state.player.speed - Math.floor(enemySpeed), 10, 90);
      const roll = seedRng.nextInt(100);
      const success = roll < chance;
      pushEvent(events, 'flee_result', turn, { chance, roll, success });
      if (success) state.outcome = 'fled';
      break;
    }
  }
}

function executeEnemyAction(
  state: CombatState,
  enemy: EnemyCombatant,
  plan: EnemyPlan,
  turn: number,
  events: CombatEvent[],
  budget: ProcBudget,
): void {
  if (enemy.vitality <= 0 || state.player.vitality <= 0) return;
  if (plan.actionId === 'stunned') {
    pushEvent(events, 'enemy_action', turn, { actionId: plan.actionId, enemyId: enemy.id });
    return;
  }
  pushEvent(events, 'enemy_action', turn, { actionId: plan.actionId, enemyId: enemy.id });
  const mitigation =
    plan.actionId === 'ward-bash' ? effectiveArmor(state.player) : state.player.armor;
  const damage = calculateDamage(plan.damage, state.player, mitigation, plan.ignoreMitigation);
  applyDamage(state.player, damage, enemy.id, turn, events);
  if (plan.status !== 'none' && state.player.vitality > 0) {
    applyStatus(
      state.player,
      plan.status,
      2,
      1,
      plan.status === 'bleeding' ? 2 : 0,
      turn,
      events,
      budget,
    );
  }
}

function decrementCooldowns(state: CombatState): void {
  for (const skillId of Object.keys(state.cooldowns) as SkillId[]) {
    state.cooldowns[skillId] = Math.max(0, state.cooldowns[skillId] - 1);
  }
}

function updateOutcome(state: CombatState, turn: number, events: CombatEvent[]): void {
  if (state.outcome !== 'ongoing') return;
  if (state.player.vitality <= 0) state.outcome = 'defeat';
  else if (aliveEnemies(state).length === 0) state.outcome = 'victory';
  if (state.outcome !== 'ongoing') pushEvent(events, 'outcome', turn, { outcome: state.outcome });
}

function resolveTurn(
  state: CombatState,
  command: CombatCommand,
  rng: DeterministicPrng,
  turn: number,
  events: CombatEvent[],
): void {
  decrementCooldowns(state);
  const budget: ProcBudget = { remaining: COMBAT_LIMITS.maxProcsPerTurn };
  tickStatuses(state.player, turn, events);
  for (const enemy of state.enemies) {
    tickStatuses(enemy, turn, events);
  }
  updateOutcome(state, turn, events);
  if (state.outcome !== 'ongoing') return;

  const plans = aliveEnemies(state).map((enemy) => ({
    enemy,
    plan: planEnemyAction(enemy, command, rng),
  }));
  state.telegraphs = plans.map(({ enemy, plan }) => ({
    attackId: plan.actionId,
    counterplay: plan.counterplay,
    enemyId: enemy.id,
    intensity: plan.intensity,
    priority: plan.priority,
  }));
  for (const telegraph of state.telegraphs) {
    pushEvent(events, 'telegraph', turn, { ...telegraph });
  }

  const reason = invalidCommandReason(state, command);
  const playerPriority = reason ? -1 : commandPriority(command);
  const actions: Array<{
    enemy: EnemyCombatant | undefined;
    plan: EnemyPlan | undefined;
    player: boolean;
    priority: number;
  }> = [
    { enemy: undefined, plan: undefined, player: true, priority: playerPriority },
    ...plans.map(({ enemy, plan }) => ({ enemy, plan, player: false, priority: plan.priority })),
  ];
  actions.sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    if (left.player !== right.player) return left.player ? -1 : 1;
    return (left.enemy?.id ?? 'player').localeCompare(right.enemy?.id ?? 'player');
  });

  for (const action of actions) {
    if (state.outcome !== 'ongoing') break;
    if (action.player) {
      if (reason) {
        pushEvent(events, 'command_rejected', turn, { command, reason });
      } else {
        pushEvent(events, 'command_accepted', turn, { command });
        executePlayerCommand(state, command, rng, turn, events, budget);
      }
      updateOutcome(state, turn, events);
    } else if (action.enemy && action.plan) {
      executeEnemyAction(state, action.enemy, action.plan, turn, events, budget);
      updateOutcome(state, turn, events);
    }
  }
  pushEvent(events, 'turn_ended', turn, {
    outcome: state.outcome,
    playerVitality: state.player.vitality,
  });
}

export function resolveCombat(input: CombatInput): CombatResolution {
  if (!Number.isSafeInteger(input.seed) || input.seed < 0 || input.seed > 0xffff_ffff) {
    throw new CombatInputError('The combat seed must be an unsigned safe integer.');
  }
  if (input.commands.length < 1 || input.commands.length > COMBAT_LIMITS.maxCommands) {
    throw new CombatInputError(`Queue 1-${COMBAT_LIMITS.maxCommands} commands per resolution.`);
  }
  validateState(input.state);
  const state = cloneState(input.state);
  const commands = input.commands.map((command) => ({ ...command })) as CombatCommand[];
  const inputStateHash = hashStable({
    commands,
    rulesetVersion: input.rulesetVersion,
    seed: input.seed,
    state,
  });
  const events: CombatEvent[] = [];
  pushEvent(events, 'resolution_started', state.turn, {
    commandCount: commands.length,
    inputStateHash,
    rulesetVersion: input.rulesetVersion,
    seed: input.seed,
  });
  const rng = new DeterministicPrng(input.seed);
  for (const [index, command] of commands.entries()) {
    const turn = state.turn;
    if (state.outcome !== 'ongoing') {
      pushEvent(events, 'command_cancelled', turn, { command, index, reason: 'combat-ended' });
      continue;
    }
    pushEvent(events, 'turn_started', turn, { commandIndex: index });
    resolveTurn(state, command, rng, turn, events);
    if (state.outcome === 'ongoing') state.turn += 1;
  }
  const outputStateHash = hashStable(state);
  const resolutionHash = hashStable({
    events,
    inputStateHash,
    outputStateHash,
    rulesetVersion: input.rulesetVersion,
    seed: input.seed,
  });
  return {
    commands,
    events,
    inputStateHash,
    outputStateHash,
    resolutionHash,
    rulesetVersion: input.rulesetVersion,
    seed: input.seed,
    state,
  };
}

export function describeEnemyPattern(pattern: EnemyPattern): EnemyPatternSpec {
  return { ...ENEMY_PATTERN_SPECS[pattern] };
}

export * from './loot.js';
