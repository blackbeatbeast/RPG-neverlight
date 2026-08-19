import { expect, test } from '@playwright/test';

test.describe('Issue #4 guest identity API', () => {
  test('starts a guest and safely retries a preference mutation', async ({ request }) => {
    const started = await request.post('http://127.0.0.1:8787/api/v1/guest/start');
    expect(started.status()).toBe(201);
    const startedBody = (await started.json()) as {
      csrfToken: string;
      player: { version: number; preferences: { theme: string } };
    };
    expect(startedBody.player.version).toBe(1);

    const csrfToken = startedBody.csrfToken;
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Idempotency-Key': 'guest-e2e-preferences-1',
    };
    const first = await request.put('http://127.0.0.1:8787/api/v1/player/preferences', {
      headers,
      data: { theme: 'modern' },
    });
    expect(first.status()).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      replayed: false,
      player: { version: 2, preferences: { theme: 'modern' } },
    });

    const retry = await request.put('http://127.0.0.1:8787/api/v1/player/preferences', {
      headers,
      data: { theme: 'modern' },
    });
    expect(retry.status()).toBe(200);
    expect(retry.headers()['idempotency-replayed']).toBe('true');
    await expect(retry.json()).resolves.toMatchObject({
      replayed: true,
      player: { version: 2 },
    });

    const reset = await request.post('http://127.0.0.1:8787/api/v1/guest/reset', {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': 'guest-e2e-reset-1',
      },
    });
    expect(reset.status()).toBe(200);
  });
});
