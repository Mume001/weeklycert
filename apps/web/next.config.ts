import type { NextConfig } from 'next'

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@wc/copy', '@wc/core', '@wc/data', '@wc/ui-tokens'],
  poweredByHeader: false,
  // Dev only: keep the Next.js indicator off "Help and support" at the bottom left.
  devIndicators: { position: 'bottom-right' },
  experimental: {
    // Imports upload up to 10 MB (spec/06 §2); the rest is multipart overhead.
    // Anything larger is refused in the browser before it is sent.
    serverActions: { bodySizeLimit: '11mb' },
  },
  // exceljs reads uploads on the server only (@wc/core/import); keep it unbundled.
  serverExternalPackages: ['exceljs'],
}

export default config
