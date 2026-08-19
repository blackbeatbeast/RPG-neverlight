const ROUTES = ['north', 'east', 'south', 'west'] as const;

export type SampleRoute = (typeof ROUTES)[number];

export interface DeterministicSample {
  seed: number;
  roll: number;
  route: SampleRoute;
}

/**
 * Returns a tiny deterministic sample for testing reproducible game calculations.
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
