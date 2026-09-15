import type { NextConfig } from 'next'

// Static export for Cloudflare Pages (spec/19 §2 and §9). No server actions.
// Pages arrive in session Z (spec/19 §10); only the skeleton exists now.
const config: NextConfig = {
  output: 'export',
  transpilePackages: ['@wc/copy', '@wc/ui-tokens'],
  poweredByHeader: false,
}

export default config
