/// <reference types="@cloudflare/workers-types" />

import type {
  D1RepositoryBoundary,
  ExplorationDataRepository,
  GuestDataRepository,
  InventoryDataRepository,
} from '@neverlight/db';

export interface WorkerBindings {
  DB: D1Database;
  ENVIRONMENT?: string;
  VERSION?: string;
  READ_ONLY?: string;
}

export type WorkerDatabaseBoundary = D1RepositoryBoundary;

export type WorkerRepository = GuestDataRepository &
  ExplorationDataRepository &
  InventoryDataRepository;

export type WorkerRepositoryFactory = (env: WorkerBindings) => WorkerRepository;

export interface HealthResponse {
  ok: true;
  service: 'project-neverlight-worker';
  environment: string;
  version: string;
}
