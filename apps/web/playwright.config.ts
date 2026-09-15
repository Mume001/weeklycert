import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

// E2E runs on the mock build (spec/09 §6, spec/19 §10).
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { DATA_SOURCE: 'mock', MOCK_TODAY: '2026-09-15' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
