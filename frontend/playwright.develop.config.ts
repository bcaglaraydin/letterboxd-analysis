import { defineConfig, devices } from '@playwright/test';

process.env.PLAYWRIGHT_SCREENSHOTS_DIR = 'screenshots-dev';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'full-gameplay-develop.spec.ts',
  timeout: 600000, // 10 minutes for full e2e journey with animations
  expect: {
    timeout: 20000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-develop', open: 'never' }]],
  outputDir: './playwright-artifacts/develop-results',
  use: {
    baseURL: 'https://d11ttpkrg0j5am.cloudfront.net',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1440, height: 960 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
});
