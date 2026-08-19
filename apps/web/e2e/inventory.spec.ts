import path from 'node:path';

import { expect, test } from '@playwright/test';

test.describe('Issue #7 inventory and loot', () => {
  test('mints server loot, supports retry/back, protects rare salvage, and explains stats', async ({
    page,
  }, testInfo) => {
    await page.goto('/?inventory=1');
    await expect(page.locator('#page-title')).toHaveText('持ち物と記録庫');
    await page.getByRole('button', { name: /持ち物を開く/ }).click();
    await expect(page.locator('.status-strip').getByText(/server-minted/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Rare以上をmint/ })).toBeVisible();

    const forged = await page.evaluate(async () => {
      const csrf =
        document.cookie
          .split(';')
          .map((part) => part.trim())
          .find((part) => part.startsWith('neverlight_csrf='))
          ?.split('=')
          .slice(1)
          .join('=') ?? '';
      const response = await fetch('/api/v1/inventory/loot/claim', {
        body: JSON.stringify({ seed: 1, sourceRef: 'glass-marsh.cache' }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'inventory-forged-seed',
          'X-CSRF-Token': decodeURIComponent(csrf),
        },
        method: 'POST',
      });
      return { body: await response.json(), status: response.status };
    });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe('INVALID_INVENTORY_REQUEST');

    const retryTranscript = await page.evaluate(async () => {
      const csrf =
        document.cookie
          .split(';')
          .map((part) => part.trim())
          .find((part) => part.startsWith('neverlight_csrf='))
          ?.split('=')
          .slice(1)
          .join('=') ?? '';
      const post = async () => {
        const response = await fetch('/api/v1/inventory/loot/claim', {
          body: JSON.stringify({ sourceRef: 'glass-marsh.cache' }),
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'inventory-retry-cache-1',
            'X-CSRF-Token': decodeURIComponent(csrf),
          },
          method: 'POST',
        });
        return { body: await response.json(), status: response.status };
      };
      const first = await post();
      const retry = await post();
      return {
        firstStatus: first.status,
        firstLedger: (first.body as { ledgerEventIds?: string[] }).ledgerEventIds?.length ?? 0,
        retryReplayed: (retry.body as { replayed?: boolean }).replayed,
      };
    });
    expect(retryTranscript).toEqual({ firstLedger: 1, firstStatus: 201, retryReplayed: true });

    await page.getByRole('button', { name: /Rare以上をmint/ }).click();
    await expect(page.locator('.inventory-card')).toHaveCount(2);
    await expect(page.getByText(/Seed hash/).first()).toBeVisible();

    // GET resume after browser refresh must preserve the minted items without a new drop.
    await page.reload();
    await expect(page.locator('.inventory-card')).toHaveCount(2);
    await expect(page.getByText(/発見記録/)).toBeVisible();

    const rareCard = page
      .locator('.inventory-card')
      .filter({ hasText: /RARE|UNIQUE|RELIC/ })
      .first();
    await expect(rareCard).toBeVisible();
    await rareCard.getByRole('button', { name: '装備' }).click();
    await expect(rareCard).toContainText('EQUIPPED');
    await expect(page.getByText(/Derived stats/)).toBeVisible();
    await rareCard.getByRole('button', { name: '外す' }).click();
    await expect(rareCard).toContainText('PACK');
    await rareCard.getByRole('button', { name: 'Lock' }).click();
    await rareCard.getByRole('button', { name: 'Favorite' }).click();
    await rareCard.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /選択を分解/ }).click();
    await expect(page.getByRole('alert')).toContainText(/保護されたアイテム/);
    await page.getByRole('button', { name: /確認して分解/ }).click();
    await expect(page.getByText(/Scrap [1-9]/)).toBeVisible();

    await page.screenshot({
      fullPage: true,
      path: path.join(testInfo.outputDir, `${testInfo.project.name}-inventory-result.png`),
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
