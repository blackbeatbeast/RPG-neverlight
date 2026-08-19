import { Hono } from 'hono';

import type { HealthResponse, WorkerBindings } from './types.js';

type WorkerEnvironment = {
  Bindings: WorkerBindings;
};

const app = new Hono<WorkerEnvironment>();

app.get('/api/health', (context) => {
  const response: HealthResponse = {
    ok: true,
    service: 'project-neverlight-worker',
    environment: context.env.ENVIRONMENT ?? 'local',
    version: context.env.VERSION ?? 'development',
  };

  return context.json(response);
});

export default app;
