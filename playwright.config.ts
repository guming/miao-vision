/**
 * Playwright E2E Test Configuration
 *
 * Configuration for end-to-end testing of Miao Vision artifacts.
 * CLI/static artifact tests do not require the Web preview dev server.
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run for
  timeout: 30000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Shared settings for all the projects below
  use: {
    baseURL: 'http://127.0.0.1:5173',
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Viewport size
    viewport: { width: 1280, height: 720 }
  },

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    },

    {
      name: 'webkit-trusted-report',
      testMatch: /trusted-interactive-report\.spec\.ts/,
      use: { ...devices['Desktop Safari'] }
    },

    // Uncomment to test on Firefox and WebKit
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // }
  ]
})
