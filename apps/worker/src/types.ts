/// <reference types="@cloudflare/workers-types" />

import type { D1RepositoryBoundary } from '@neverlight/db';

export interface WorkerBindings {
  DB: D1Database;
  ENVIRONMENT?: string;
  VERSION?: string;
}

export type WorkerDatabaseBoundary = D1RepositoryBoundary;

export interface HealthResponse {
  ok: true;
  service: 'project-neverlight-worker';
  environment: string;
  version: string;
}
