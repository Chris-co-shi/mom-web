import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  reporter: ci ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mom-admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:5555',
      },
    },
    {
      name: 'supplier-portal-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:5556',
      },
    },
    {
      name: 'customer-portal-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:5557',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @mom/mom-admin dev --host 127.0.0.1 --strictPort',
      reuseExistingServer: !ci,
      timeout: 120_000,
      url: 'http://127.0.0.1:5555',
    },
    {
      command: 'pnpm --filter @mom/supplier-portal dev --host 127.0.0.1 --strictPort',
      reuseExistingServer: !ci,
      timeout: 120_000,
      url: 'http://127.0.0.1:5556',
    },
    {
      command: 'pnpm --filter @mom/customer-portal dev --host 127.0.0.1 --strictPort',
      reuseExistingServer: !ci,
      timeout: 120_000,
      url: 'http://127.0.0.1:5557',
    },
  ],
});
