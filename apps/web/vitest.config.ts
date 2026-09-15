import { fileURLToPath } from 'node:url'
import { defineProject } from 'vitest/config'

export default defineProject({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['test/e2e/**', 'node_modules/**', '.next/**'],
    setupFiles: ['./test/setup.ts'],
    env: { MOCK_DELAY_MS: '0' },
  },
})
