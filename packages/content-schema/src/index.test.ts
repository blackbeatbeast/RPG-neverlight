import { describe, expect, it } from 'vitest';

import { contentBundleSchema, parseContentBundle } from './index.js';
import { invalidFoundationFixture, validFoundationFixture } from './fixtures.js';

describe('contentBundleSchema', () => {
  it('accepts the valid foundation fixture', () => {
    expect(parseContentBundle(validFoundationFixture)).toEqual(validFoundationFixture);
  });

  it('rejects the invalid foundation fixture', () => {
    const result = contentBundleSchema.safeParse(invalidFoundationFixture);

    expect(result.success).toBe(false);
  });
});
