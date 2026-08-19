/// <reference types="@cloudflare/workers-types" />

export interface D1RepositoryBoundary {
  readonly db: D1Database;
}

/**
 * Keeps the Cloudflare binding at the database package boundary.
 * Repository and transaction implementations can be added in later packets.
 */
export function createD1RepositoryBoundary(db: D1Database): D1RepositoryBoundary {
  return { db };
}
