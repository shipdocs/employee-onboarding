/**
 * Playwright Configuration for CI
 * Optimized for continuous integration environments
 */

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  
  // CI-specific settings
  workers: 4,
  retries: 2,
  
  // Fail fast on CI
  maxFailures: 10,
  
  // No web server in CI (app should already be running)
  webServer: undefined,
  
  // More aggressive timeouts for CI
  timeout: 30 * 1000,
  
  use: {
    ...baseConfig.use,
    // No videos in CI to save space
    video: 'on-first-retry',
    // Headless only in CI
    headless: true,
  },
  
  // Only run on main browsers in CI
  projects: [
    {
      name: 'chromium',
      use: { ...baseConfig.projects?.[0]?.use },
    },
    {
      name: 'firefox',
      use: { ...baseConfig.projects?.[1]?.use },
    },
  ],
});