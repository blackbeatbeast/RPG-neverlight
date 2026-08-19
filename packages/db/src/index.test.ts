import { describe, expect, it } from 'vitest';

import {
  createD1GuestRepository,
  createD1RepositoryBoundary,
  FEATURE_FLAG_KEYS,
  type D1RepositoryBoundary,
  type GuestSessionInput,
} from './index.js';

class RecordingPreparedStatement {
  readonly values: unknown[] = [];

  constructor(
    readonly query: string,
    private readonly changes = 1,
  ) {}

  bind(...values: unknown[]): RecordingPreparedStatement {
    this.values.push(...values);
    return this;
  }

  async first<T>(): Promise<T | null> {
    return null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: [] };
  }

  async run(): Promise<{ meta: { changes: number } }> {
    return { meta: { changes: this.changes } };
  }
}

class RecordingDatabase {
  readonly statements: RecordingPreparedStatement[] = [];

  prepare(query: string): RecordingPreparedStatement {
    const statement = new RecordingPreparedStatement(query);
    this.statements.push(statement);
    return statement;
  }

  async batch<T>(
    statements: RecordingPreparedStatement[],
  ): Promise<Array<{ results: T[]; meta: { changes: number } }>> {
    return statements.map(() => ({ results: [], meta: { changes: 1 } }));
  }
}

function databaseAsD1(
  database: RecordingDatabase,
): Parameters<typeof createD1RepositoryBoundary>[0] {
  return database as unknown as Parameters<typeof createD1RepositoryBoundary>[0];
}

const sessionInput: GuestSessionInput = {
  accountId: 'acct_test',
  playerId: 'player_test',
  sessionId: 'session_test',
  handle: 'guest-test',
  tokenHash: 'token-hash',
  csrfTokenHash: 'csrf-hash',
  createdAt: '2026-08-20T00:00:00.000Z',
  expiresAt: '2026-09-19T00:00:00.000Z',
};

describe('D1 repository boundary', () => {
  it('keeps the D1 binding behind the package boundary', () => {
    const database = {} as Parameters<typeof createD1RepositoryBoundary>[0];
    const boundary: D1RepositoryBoundary = createD1RepositoryBoundary(database);

    expect(boundary).toEqual({ db: database });
  });

  it('creates all Issue #4 guest scaffolding in one D1 batch', async () => {
    const database = new RecordingDatabase();
    const repository = createD1GuestRepository(databaseAsD1(database));

    await repository.createGuest(sessionInput);

    expect(database.statements).toHaveLength(5 + FEATURE_FLAG_KEYS.length);
    expect(database.statements.map((statement) => statement.query).join('\n')).toContain(
      'INSERT INTO accounts',
    );
    expect(database.statements.map((statement) => statement.query).join('\n')).toContain(
      'INSERT INTO sessions',
    );
    expect(database.statements.map((statement) => statement.query).join('\n')).toContain(
      'INSERT INTO player_preferences',
    );
    expect(database.statements.map((statement) => statement.query).join('\n')).toContain(
      'INSERT INTO player_feature_flags',
    );
  });

  it('uses a bounded upsert for the rate-limit bucket', async () => {
    const database = new RecordingDatabase();
    const repository = createD1GuestRepository(databaseAsD1(database));

    await expect(
      repository.consumeRateLimit({
        bucketKey: 'hashed-client',
        action: 'guest.start',
        windowStart: 1_000,
        limit: 10,
        now: sessionInput.createdAt,
      }),
    ).resolves.toBe(true);
    expect(database.statements.at(-1)?.query).toContain('ON CONFLICT(bucket_key, action)');
    expect(database.statements.at(-1)?.query).toContain('count < ?');
  });
});
