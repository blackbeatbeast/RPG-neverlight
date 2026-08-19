import { describe, expect, it } from 'vitest';

import { sampleDeterministicValue } from './index.js';

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
