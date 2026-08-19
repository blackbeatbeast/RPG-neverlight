const { COMBAT_LIMITS, ENEMY_PATTERN_SPECS, createCombatState, hashStable, resolveCombat } =
  await import('../packages/game-core/dist/index.js');

function integerArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > 100_000) {
    throw new Error(`${name} must be an integer between 1 and 100000.`);
  }
  return value;
}

const runs = integerArgument('--runs', 1_000);
const patterns = Object.keys(ENEMY_PATTERN_SPECS).sort();
const report = {
  limits: {
    maxCommands: COMBAT_LIMITS.maxCommands,
    maxDamagePerAction: COMBAT_LIMITS.maxDamagePerAction,
    maxEvents: COMBAT_LIMITS.maxEvents,
    maxProcsPerTurn: COMBAT_LIMITS.maxProcsPerTurn,
  },
  patterns: {},
  runs,
};

for (const pattern of patterns) {
  const summary = {
    checksum: '',
    defeats: 0,
    events: 0,
    fled: 0,
    ongoing: 0,
    totalDamage: 0,
    victories: 0,
  };
  for (let run = 0; run < runs; run += 1) {
    const commands =
      pattern === 'heavy-telegraph'
        ? [
            { type: 'guard' },
            { targetId: 'enemy.heavy-telegraph.1', type: 'strike' },
            { targetId: 'enemy.heavy-telegraph.1', type: 'strike' },
          ]
        : pattern === 'warded-guardian'
          ? [
              { skillId: 'ward-break', targetId: 'enemy.warded-guardian.1', type: 'skill' },
              { skillId: 'piercing-lunge', targetId: 'enemy.warded-guardian.1', type: 'skill' },
              { targetId: 'enemy.warded-guardian.1', type: 'strike' },
            ]
          : [
              { stance: 'defensive', type: 'shift' },
              { type: 'guard' },
              { targetId: 'enemy.retaliator.1', type: 'strike' },
            ];
    const resolution = resolveCombat({
      commands,
      rulesetVersion: '1.0.0',
      seed: run + 1,
      state: createCombatState(pattern),
    });
    summary.events += resolution.events.length;
    for (const event of resolution.events) {
      if (event.type === 'damage' && typeof event.data.amount === 'number')
        summary.totalDamage += event.data.amount;
    }
    if (resolution.state.outcome === 'victory') summary.victories += 1;
    else if (resolution.state.outcome === 'defeat') summary.defeats += 1;
    else if (resolution.state.outcome === 'fled') summary.fled += 1;
    else summary.ongoing += 1;
  }
  const metrics = { ...summary };
  delete metrics.checksum;
  summary.checksum = hashStable({ metrics, pattern, runs });
  report.patterns[pattern] = summary;
}

console.log(JSON.stringify(report, null, 2));
