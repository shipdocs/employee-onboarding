import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/content-management-buttons.spec.ts',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: [
    ['html'],
    ['list']
  ],

  use: {
    baseURL: 'https://maritime-onboarding.example.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  timeout: 120 * 1000, // 2 minutes per test
  expect: {
    timeout: 15 * 1000 // 15 seconds for assertions
  }
});
