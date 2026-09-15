import type { NextConfig } from 'next'

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@wc/copy', '@wc/core', '@wc/data', '@wc/ui-tokens'],
  poweredByHeader: false,
}

export default config
