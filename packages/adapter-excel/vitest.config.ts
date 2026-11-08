import { defineConfig } from 'vitest/config'

// Coverage thresholds are a floor measured on 2026-11-09 (see docs/testing-strategy.md):
// raise them when coverage improves, never lower them without a review.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text-summary', 'lcov'],
      thresholds: { lines: 98, statements: 91, functions: 96, branches: 82 }
    }
  }
})
