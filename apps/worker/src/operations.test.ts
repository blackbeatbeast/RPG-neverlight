import { describe, expect, it } from 'vitest';

import { BudgetTracker, readBudgetSettings } from './operations.js';

describe('preview budget tracker', () => {
  it('records a deterministic degraded/read-only transcript without a network or database', () => {
    const environment = {
      BUDGET_WINDOW_SECONDS: '60',
      BUDGET_REQUEST_LIMIT: '5',
      BUDGET_WRITE_LIMIT: '5',
      BUDGET_DEGRADED_REQUESTS: '2',
      BUDGET_READ_ONLY_REQUESTS: '4',
      BUDGET_DEGRADED_WRITES: '2',
      BUDGET_READ_ONLY_WRITES: '4',
    };
    const tracker = new BudgetTracker();
    const transcript = [
      tracker.observe(environment, 'GET', '/api/v1/player', 120),
      tracker.observe(environment, 'POST', '/api/v1/guest/start', 120),
      tracker.observe(environment, 'GET', '/api/v1/player', 120),
      tracker.observe(environment, 'POST', '/api/v1/player/preferences', 120),
    ];
    expect(transcript.map((entry) => entry.mode)).toEqual([
      'normal',
      'degraded',
      'degraded',
      'read-only',
    ]);
    expect(transcript.at(-1)).toMatchObject({
      reason: 'budget:request-read-only-threshold',
      requestCount: 4,
      writeCount: 2,
      windowStartedAt: 120,
      windowResetsAt: 180,
    });
  });

  it('clamps malformed thresholds and keeps the write cap below the provider plan', () => {
    const settings = readBudgetSettings({
      BUDGET_REQUEST_LIMIT: 'not-a-number',
      BUDGET_WRITE_LIMIT: '10',
      BUDGET_DEGRADED_WRITES: '20',
      BUDGET_READ_ONLY_WRITES: '1',
    });
    expect(settings.requestLimit).toBe(50_000);
    expect(settings.writeLimit).toBe(10);
    expect(settings.degradedWrites).toBe(10);
    expect(settings.readOnlyWrites).toBe(10);
  });
});
