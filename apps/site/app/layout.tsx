import './globals.css'
import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteNav } from '@/components/SiteNav'

/**
 * spec/19 §8: the site loads its font through `next/font/local` and not through
 * the `@font-face` block in `@wc/ui-tokens`, because this page has an LCP target
 * of 1.5 s on 3G and next/font gives preload, font-display and size-adjust
 * without hand-written link tags.
 *
 * Only weight 400 is declared, because only weight 400 exists: the repository
 * carries `ibm-plex-sans-400-*.woff2` and nothing else for Sans. spec/14 §4 asks
 * for 400, 500 and 600, and 19 §8 asks to preload 400 and 600. Until those two
 * files are added, 500 and 600 are synthesised by the browser, here and in the
 * application alike.
 */
const sans = localFont({
  src: [
    {
      path: '../../../packages/ui-tokens/fonts/ibm-plex-sans-400-latin.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-site-sans',
  display: 'swap',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
})

export const metadata: Metadata = {
  title: copy.brand.name,
  description: copy.site.footer.description,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
