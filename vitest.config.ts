import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/web'],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**'],
      exclude: ['**/*.test.ts', '**/__testing__/**'],
      // spec/12 step 2: coverage of packages/core/engine is at least 95 percent.
      thresholds: {
        'packages/core/src/engine/**': {
          statements: 95,
          branches: 85,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
})
