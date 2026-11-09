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
      // Raised with the component tests (ADR 0011): measured 46.3 / 45.2 / 39.2 / 38.7, about one point of margin.
      thresholds: { lines: 45, statements: 44, functions: 38, branches: 37 }
    }
  }
})
