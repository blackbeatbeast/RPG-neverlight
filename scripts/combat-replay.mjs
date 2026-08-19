import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const { resolveCombat, stableStringify } = await import('../packages/game-core/dist/index.js');

function escapeRegExp(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
}

function expandPath(input) {
  const candidate = resolve(input);
  if (existsSync(candidate) && statSync(candidate).isFile()) return [candidate];
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    return readdirSync(candidate)
      .filter((entry) => entry.endsWith('.json'))
      .sort()
      .map((entry) => resolve(candidate, entry));
  }
  const normalized = input.replaceAll('\\', '/');
  const directory = resolve(dirname(normalized));
  const pattern = new RegExp(`^${escapeRegExp(basename(normalized))}$`);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((entry) => pattern.test(entry))
    .sort()
    .map((entry) => resolve(directory, entry));
}

const requested = process.argv.slice(2).filter((argument) => argument !== '--');
const fixturePaths = [
  ...new Set((requested.length ? requested : ['fixtures/combat/*.json']).flatMap(expandPath)),
];
if (fixturePaths.length === 0) {
  console.error('No combat fixtures matched.');
  process.exitCode = 1;
} else {
  let failures = 0;
  for (const fixturePath of fixturePaths) {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    try {
      const first = resolveCombat(fixture.input);
      const second = resolveCombat(fixture.input);
      const replayStable = stableStringify(first) === stableStringify(second);
      const actualEventTypes = first.events.map((event) => event.type);
      const expected = fixture.expected ?? {};
      const mismatches = [];
      if (first.resolutionHash !== expected.resolutionHash) {
        mismatches.push(
          `resolutionHash expected ${expected.resolutionHash} got ${first.resolutionHash}`,
        );
      }
      if (first.outputStateHash !== expected.outputStateHash) {
        mismatches.push(
          `outputStateHash expected ${expected.outputStateHash} got ${first.outputStateHash}`,
        );
      }
      if (first.state.outcome !== expected.outcome) {
        mismatches.push(`outcome expected ${expected.outcome} got ${first.state.outcome}`);
      }
      if (
        Array.isArray(expected.eventTypes) &&
        stableStringify(actualEventTypes) !== stableStringify(expected.eventTypes)
      ) {
        mismatches.push(
          `eventTypes expected ${stableStringify(expected.eventTypes)} got ${stableStringify(actualEventTypes)}`,
        );
      }
      if (!replayStable) mismatches.push('same input produced a different normalized resolution');
      if (mismatches.length > 0) {
        failures += 1;
        console.error(`REPLAY FAIL ${fixture.name ?? fixturePath}`);
        console.error(`  actual resolutionHash=${first.resolutionHash}`);
        console.error(`  actual outputStateHash=${first.outputStateHash}`);
        console.error(`  actual outcome=${first.state.outcome}`);
        console.error(`  ${mismatches.join('; ')}`);
      } else {
        console.log(
          `REPLAY PASS ${fixture.name ?? fixturePath} resolutionHash=${first.resolutionHash} outcome=${first.state.outcome} events=${first.events.length}`,
        );
      }
    } catch (error) {
      failures += 1;
      console.error(
        `REPLAY ERROR ${fixture.name ?? fixturePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (failures > 0) process.exitCode = 1;
  else console.log(`Replayed ${fixturePaths.length} combat fixture(s) with byte-stable results.`);
}
