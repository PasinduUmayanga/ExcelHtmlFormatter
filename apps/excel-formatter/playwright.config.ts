import { defineConfig } from '@playwright/test'

// End-to-end tests drive the built Electron app (see e2e/fixtures.ts). One app at a time.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['junit', { outputFile: 'test-results/e2e-junit.xml' }]] : 'list',
  outputDir: 'test-results'
})
