/// <reference types="@cloudflare/workers-types" />

import type {
  D1RepositoryBoundary,
  ExplorationDataRepository,
  GuestDataRepository,
  InventoryDataRepository,
} from '@neverlight/db';
import type { OperationalEnvironment } from './operations.js';

export interface WorkerBindings extends OperationalEnvironment {
  DB: D1Database;
  ENVIRONMENT?: string;
  VERSION?: string;
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
