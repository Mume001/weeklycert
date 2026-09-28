import { defineConfig, devices } from '@playwright/test'

const PORT = 3102

// The 90-second demo video (spec/20 O, 12 step 3): recorded by Playwright on
// the mock build, no sound, captions shown in the picture. Not part of
// `pnpm e2e`; run with `pnpm --filter web demo:video` when the screens change.
export default defineConfig({
  testDir: './test/demo',
  workers: 1,
  reporter: [['list']],
  timeout: 180_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    video: { mode: 'on', size: { width: 1280, height: 720 } },
  },
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { DATA_SOURCE: 'mock', MOCK_TODAY: '2026-09-15' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
})
