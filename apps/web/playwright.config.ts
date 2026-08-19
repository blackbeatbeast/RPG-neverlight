import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: '../../test-results/issue-002',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../../playwright-report/issue-002' }],
  ],
  retries: process.env.CI ? 1 : 0,
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    screenshot: 'off',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @neverlight/worker run dev',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:8787/api/health',
    },
    {
      command: 'pnpm --filter @neverlight/web run dev',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:5173',
    },
  ],
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        deviceScaleFactor: 1,
        hasTouch: true,
        viewport: { height: 800, width: 360 },
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { height: 900, width: 1280 },
      },
    },
  ],
});
