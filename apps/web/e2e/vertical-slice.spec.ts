import path from 'node:path';

import { expect, test } from '@playwright/test';

test.describe('Issue #6 vertical-slice', () => {
  test('completes the server-authoritative route on the active viewport', async ({
    page,
  }, testInfo) => {
    await page.goto('/?vertical=1');
    await expect(page.locator('#page-title')).toHaveText('実APIの縦切り');

    await page.getByRole('button', { name: /実APIルートを開始/ }).click();
    await expect(page.locator('#page-title')).toHaveText('硝子沼の水路');
    await expect(page.getByText(/Seed hash/)).toBeVisible();

    await page.getByRole('button', { name: /遭遇を選ぶ/ }).click();
    await expect(page.locator('#page-title')).toHaveText('硝子沼の鐘守');
    await expect(page.getByText(/heavy-telegraph/)).toBeVisible();

    // A refresh is a GET resume, not a second route mutation.
    await page.reload();
    await expect(page.locator('#page-title')).toHaveText('硝子沼の鐘守');
    await page.getByRole('button', { name: /^攻撃/ }).click();
    await page.getByRole('button', { name: /^攻撃/ }).click();
    await page.getByRole('button', { name: /^攻撃/ }).click();
    await page.getByRole('button', { name: /命令を解決/ }).click();
    await expect(page.locator('#page-title')).toHaveText('遭遇の記録');
    await expect(page.getByText(/Resolution hash/)).toBeVisible();

    await page.screenshot({
      fullPage: true,
      path: path.join(testInfo.outputDir, `${testInfo.project.name}-vertical-slice-result.png`),
    });
    await page.getByRole('button', { name: /結果を確認して退出/ }).click();
    await expect(page.locator('#page-title')).toHaveText('ルート完了');
    await expect(page.getByText(/退出結果は保存済み/)).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('rejects forged seed/result fields and returns read-only guidance', async ({ page }) => {
    await page.goto('/?vertical=1');
    await page.getByRole('button', { name: /実APIルートを開始/ }).click();
    await expect(page.locator('#page-title')).toHaveText('硝子沼の水路');

    const forged = await page.evaluate(async () => {
      const csrf =
        document.cookie
          .split(';')
          .map((part) => part.trim())
          .find((part) => part.startsWith('neverlight_csrf='))
          ?.split('=')
          .slice(1)
          .join('=') ?? '';
      const response = await fetch('/api/v1/routes/current/choose', {
        body: JSON.stringify({
          expectedVersion: 1,
          nodeId: 'encounter',
          result: { outcome: 'victory' },
          seed: 1,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'vertical-forged-fields',
          'X-CSRF-Token': decodeURIComponent(csrf),
        },
        method: 'POST',
      });
      return { body: await response.json(), status: response.status };
    });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe('INVALID_ROUTE_REQUEST');

    await page.goto('/?vertical=1&readOnly=1');
    await expect(page.locator('#page-title')).toHaveText('読み取り専用');
    await expect(page.getByText(/mutationは503/)).toBeVisible();
    await expect(page.getByRole('button', { name: /実APIルートを開始/ })).toHaveCount(0);
  });

  test('fault-injection retry/back/refresh transcript', async ({ page }) => {
    await page.goto('/?vertical=1');
    await page.getByRole('button', { name: /実APIルートを開始/ }).click();
    await expect(page.locator('#page-title')).toHaveText('硝子沼の水路');

    const mutate = async (path: string, body: Record<string, unknown>, key: string) =>
      page.evaluate(
        async ({ body, key, path }) => {
          const csrf =
            document.cookie
              .split(';')
              .map((part) => part.trim())
              .find((part) => part.startsWith('neverlight_csrf='))
              ?.split('=')
              .slice(1)
              .join('=') ?? '';
          const response = await fetch(path, {
            body: JSON.stringify(body),
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': key,
              'X-CSRF-Token': decodeURIComponent(csrf),
            },
            method: 'POST',
          });
          return { body: await response.json(), status: response.status };
        },
        { body, key, path },
      );

    const chosen = await mutate(
      '/api/v1/routes/current/choose',
      { expectedVersion: 1, nodeId: 'encounter' },
      'fault-choose-1',
    );
    expect(chosen.status).toBe(200);
    const chosenBody = chosen.body as RoutePayload;
    const chosenRetry = await mutate(
      '/api/v1/routes/current/choose',
      { expectedVersion: 1, nodeId: 'encounter' },
      'fault-choose-1',
    );
    expect(chosenRetry.status).toBe(200);
    expect((chosenRetry.body as RoutePayload).replayed).toBe(true);

    await page.goto('/?vertical=1&resume=1');
    await expect(page.locator('#page-title')).toHaveText('硝子沼の鐘守');
    await page.goBack();
    await expect(page.locator('#page-title')).toHaveText('硝子沼の鐘守');

    const targetId = chosenBody.route.encounter?.combatState.enemies[0]?.id;
    expect(targetId).toBeTruthy();
    const combatRequest = {
      commands: [
        { targetId, type: 'strike' },
        { targetId, type: 'strike' },
        { targetId, type: 'strike' },
      ],
      expectedVersion: 2,
    };
    const resolved = await mutate('/api/v1/routes/current/combat', combatRequest, 'fault-combat-1');
    expect(resolved.status).toBe(200);
    const resolvedRetry = await mutate(
      '/api/v1/routes/current/combat',
      combatRequest,
      'fault-combat-1',
    );
    expect(resolvedRetry.status).toBe(200);
    expect((resolvedRetry.body as RoutePayload).replayed).toBe(true);

    await page.reload();
    await expect(page.locator('#page-title')).toHaveText('遭遇の記録');
    console.log(
      'fault transcript',
      JSON.stringify({
        back: 'resumed encounter',
        combatRetry: 'original result',
        refresh: 'resumed result',
      }),
    );
  });
});
