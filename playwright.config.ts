import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  timeout: 6 * 60 * 1000,
});
