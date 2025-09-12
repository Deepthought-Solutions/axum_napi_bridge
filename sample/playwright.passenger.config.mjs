// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/passenger.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run passenger tests sequentially
  reporter: process.env.CI ? 'list' : 'html',
  timeout: 720000, // 12 minute timeout for Docker operations
  use: {
    trace: 'on-first-retry',
    headless: process.env.CI ? true : false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer config - tests will manage Docker themselves
});