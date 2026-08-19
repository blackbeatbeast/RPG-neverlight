import path from 'node:path';

import { expect, test } from '@playwright/test';

test.describe('Issue #2 semantic retro/modern shell', () => {
  test('keeps the canonical flow operable and captures viewport evidence', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('#page-title')).toHaveText('Vesper Arkへようこそ');
    await expect(page.getByRole('link', { name: '本文へ移動' })).toBeAttached();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    await page.screenshot({
      fullPage: true,
      path: path.join(testInfo.outputDir, `${testInfo.project.name}-shell.png`),
    });

    await page.getByRole('button', { name: /ゲームを始める/ }).click();
    await expect(page.locator('#page-title')).toHaveText('雨鐘街の広場');
    await page.keyboard.press('1');
    await expect(page.locator('#page-title')).toHaveText('次の道を選ぶ');
    await page.getByRole('button', { name: /送電塔を探索/ }).click();
    await expect(page.locator('#page-title')).toHaveText('雨の送電塔');
    await page.keyboard.press('1');
    await expect(page.locator('#page-title')).toHaveText('信号の獣');

    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await expect(page.getByText('COMMAND QUEUE / 3/3')).toBeVisible();
    await page.keyboard.press('4');
    await expect(page.locator('#page-title')).toHaveText('遭遇の記録');
    await page.getByRole('button', { name: /戦利品を読む/ }).click();
    await expect(page.locator('#page-title')).toHaveText('残響する部品');

    await page.locator('.utility-nav').getByRole('button', { exact: true, name: '記録庫' }).click();
    await expect(page.locator('#page-title')).toHaveText('記録庫');
    const search = page.getByRole('searchbox', { name: '記録を検索' });
    await search.focus();
    await page.keyboard.press('1');
    await expect(page.locator('#page-title')).toHaveText('記録庫');
    await page.keyboard.press('Escape');
    await expect(page.locator('#page-title')).toHaveText('記録庫');

    await page.locator('.utility-nav').getByRole('button', { exact: true, name: '設定' }).click();
    const commandKeysBefore = await page
      .locator('[data-command-key]')
      .evaluateAll((items) => items.map((item) => item.getAttribute('data-command-key')));
    await page.keyboard.press('1');
    await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'modern');
    const commandKeysAfter = await page
      .locator('[data-command-key]')
      .evaluateAll((items) => items.map((item) => item.getAttribute('data-command-key')));
    expect(commandKeysAfter).toEqual(commandKeysBefore);

    await page.locator('.utility-nav').getByRole('button', { exact: true, name: '街' }).click();
    await page.getByRole('button', { name: /空の状態を見る/ }).click();
    await expect(page.locator('.state-panel--empty')).toBeVisible();
    await page.getByRole('button', { name: /記録庫へ戻る/ }).click();
    await page.getByRole('button', { name: /空白ページを見る/ }).click();
    await expect(page.locator('.state-panel--empty')).toBeVisible();
    await page.getByRole('button', { name: '街へ戻る' }).click();
    await page.getByRole('button', { name: /エラー状態を見る/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.locator('.utility-nav').getByRole('button', { exact: true, name: '街' }).click();
    await page.getByRole('button', { name: /運用状態を見る/ }).click();
    await expect(page.locator('#page-title')).toHaveText('静かな保守時間');
    await expect(
      page
        .locator('.state-panel--warning')
        .getByRole('heading', { exact: true, name: '読み取り専用' }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ height: 1200, width: 640 });
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    const zoomOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(zoomOverflow).toBeLessThanOrEqual(1);
  });

  test('works with images disabled and reduced motion requested', async ({ page }) => {
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', (route) => route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.getByRole('img', { name: /雨の向こう/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ゲームを始める/ })).toBeVisible();
    await expect(page.getByText(/画像がなくても/)).toBeVisible();
    await expect(page.locator('.skip-link')).toBeAttached();
  });
});
