import { describe, expect, it } from 'vitest';

import { canonicalContentJson, contentBundleSchema, validateContentBundle } from './index.js';
import { invalidContentFixtures, validContentBundleFixture } from './fixtures.js';

describe('versioned content bundle validation', () => {
  it('accepts the complete valid fixture', () => {
    const result = validateContentBundle(validContentBundleFixture);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects an underage named character with an actionable path', () => {
    const result = validateContentBundle(invalidContentFixtures.underageCharacter);

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.path === 'characters[0].age')).toBe(true);
  });

  it('rejects an unreachable route node', () => {
    const result = validateContentBundle(invalidContentFixtures.unreachableRoute);

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.message.includes('unreachable'))).toBe(true);
  });

  it('rejects drop tables whose probability mass does not equal one', () => {
    const result = validateContentBundle(invalidContentFixtures.invalidDropMath);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (issue) =>
          issue.path === 'dropTables[0].entries' && issue.message.includes('total exactly 1.0'),
      ),
    ).toBe(true);
  });

  it('rejects a suggestive asset without a general fallback', () => {
    const result = validateContentBundle(invalidContentFixtures.suggestiveWithoutFallback);

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.path === 'assets[1].generalFallbackId')).toBe(true);
  });

  it('keeps canonical serialization stable when definition arrays are reordered', () => {
    const reordered = {
      ...validContentBundleFixture,
      items: [...validContentBundleFixture.items].reverse(),
      characters: [...validContentBundleFixture.characters].reverse(),
    };

    expect(canonicalContentJson(reordered)).toBe(canonicalContentJson(validContentBundleFixture));
  });

  it('keeps the runtime schema strict and versioned', () => {
    const result = contentBundleSchema.safeParse({
      ...validContentBundleFixture,
      unexpected: true,
    });

    expect(result.success).toBe(false);
  });
});
