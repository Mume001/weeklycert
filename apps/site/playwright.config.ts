import { defineConfig, devices } from '@playwright/test'

const PORT = 3201

// The suite runs against the static export, not against a dev server, because
// the export is what Cloudflare Pages receives (spec/19 §9).
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm build && node test/serve.mjs',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { PORT: String(PORT) },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
