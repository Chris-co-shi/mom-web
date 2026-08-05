import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env.CI);
const adminBaseUrl = process.env.MOM_E2E_ADMIN_URL ?? 'http://127.0.0.1:5555';
const supplierBaseUrl = process.env.MOM_E2E_SUPPLIER_URL ?? 'http://127.0.0.1:5556';
const customerBaseUrl = process.env.MOM_E2E_CUSTOMER_URL ?? 'http://127.0.0.1:5557';

function portOf(baseUrl: string): string {
  const port = new URL(baseUrl).port;
  if (!port) throw new Error(`E2E base URL must include an explicit port: ${baseUrl}`);
  return port;
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: ci,
  expect: {
    timeout: 10_000,
  },
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
        baseURL: adminBaseUrl,
      },
    },
    {
      name: 'supplier-portal-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: supplierBaseUrl,
      },
    },
    {
      name: 'customer-portal-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: customerBaseUrl,
      },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @mom/mom-admin dev --host 127.0.0.1 --strictPort --port ${portOf(adminBaseUrl)}`,
      reuseExistingServer: !ci,
      timeout: 120_000,
      url: adminBaseUrl,
    },
    {
      command: `pnpm --filter @mom/supplier-portal dev --host 127.0.0.1 --strictPort --port ${portOf(supplierBaseUrl)}`,
      reuseExistingServer: !ci,
      timeout: 120_000,
      url: supplierBaseUrl,
    },
    {
      command: `pnpm --filter @mom/customer-portal dev --host 127.0.0.1 --strictPort --port ${portOf(customerBaseUrl)}`,
      reuseExistingServer: !ci,
      timeout: 120_000,
      url: customerBaseUrl,
    },
  ],
});
