import { fileURLToPath } from 'node:url'
import { defineProject } from 'vitest/config'

export default defineProject({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    name: 'site',
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'out/**'],
    // test/site.test.tsx reads this app's own source to prove what is not in
    // it. Under jsdom `import.meta.url` is an http URL, and the working
    // directory is the repository root when the suite runs every project at
    // once, so neither can point at this folder. This file runs in Node, knows
    // where it is, and hands the answer over.
    env: { SITE_ROOT: fileURLToPath(new URL('./', import.meta.url)) },
  },
})
