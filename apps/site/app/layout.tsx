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
 * All three weights of spec/14 §4 are declared, and each one has its own file:
 * 400 for body text, 500 for the navigation, 600 for every heading and button.
 * Declaring only 400, which is what this file did until the files existed, does
 * not mean the page has one weight. It means the browser fakes the other two.
 *
 * Only the latin subset is loaded here. latin-ext exists in the package for the
 * application, where a crew list carries accented names; the marketing copy is
 * English and every byte counts against the 3G budget (16 §8).
 */
const sans = localFont({
  src: [
    {
      path: '../../../packages/ui-tokens/fonts/ibm-plex-sans-400-latin.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../packages/ui-tokens/fonts/ibm-plex-sans-500-latin.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../packages/ui-tokens/fonts/ibm-plex-sans-600-latin.woff2',
      weight: '600',
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
