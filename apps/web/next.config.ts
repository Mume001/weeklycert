import type { NextConfig } from 'next'

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@wc/copy', '@wc/core', '@wc/data', '@wc/ui-tokens'],
  poweredByHeader: false,
  // Dev only: keep the Next.js indicator off "Help and support" at the bottom left.
  devIndicators: { position: 'bottom-right' },
}

export default config
