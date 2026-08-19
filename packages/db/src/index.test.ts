import { describe, expect, it } from 'vitest';

import { createD1RepositoryBoundary } from './index.js';

describe('createD1RepositoryBoundary', () => {
  it('keeps the D1 binding behind the package boundary', () => {
    const database = {} as Parameters<typeof createD1RepositoryBoundary>[0];

    expect(createD1RepositoryBoundary(database)).toEqual({ db: database });
  });
});
