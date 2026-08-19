import { describe, expect, it } from 'vitest';

import app from './index.js';
import type { WorkerBindings } from './types.js';

describe('GET /api/health', () => {
  it('returns a typed local health payload', async () => {
    const env = {
      DB: {} as WorkerBindings['DB'],
      ENVIRONMENT: 'local',
      VERSION: 'development',
    } satisfies WorkerBindings;

    const response = await app.request('/api/health', undefined, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      environment: 'local',
      ok: true,
      service: 'project-neverlight-worker',
      version: 'development',
    });
  });
});
