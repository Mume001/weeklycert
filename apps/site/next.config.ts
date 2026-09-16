import type { NextConfig } from 'next'

// Static export for Cloudflare Pages (spec/19 §2 and §9). No server actions.
// Pages arrive in session Z (spec/19 §10); only the skeleton exists now.
const config: NextConfig = {
  output: 'export',
  transpilePackages: ['@wc/copy', '@wc/ui-tokens'],
  poweredByHeader: false,
  experimental: {
    // The heading is the largest contentful paint, and on 3G it was waiting a
    // whole 562 ms round trip for a 20 kB stylesheet before it could paint.
    // Inlined, the first response carries everything the first screen needs.
    // The budget in 16 §8 is latency bound, not bandwidth bound: two sequential
    // round trips are already 1.1 s of the 1.5 s allowed.
    inlineCss: true,
  },
}

export default config
