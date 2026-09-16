import './globals.css'
import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'

/**
 * IBM Plex Sans and Mono are self-hosted by @wc/ui-tokens (spec/14 §4). This app
 * uses the `@font-face` route rather than `next/font`, and spec/19 §8 attaches
 * one obligation to that choice: `font-display: swap`, which is in the
 * stylesheet, and a hand written preload for the two weights that are on screen
 * before anyone scrolls, Sans 400 and Sans 600.
 *
 * Without it the browser only learns the font exists after the stylesheet has
 * parsed, a whole round trip late, and the shell paints in Segoe UI and then
 * reflows into Plex.
 *
 * The href cannot be spelled out by hand: the bundler emits the file under a
 * content hash. `new URL(file, import.meta.url)` is a reference to the same
 * file the stylesheet points at, so it resolves to the same emitted asset;
 * test/e2e/grid.spec.ts fails if the two ever come apart, because a preload of
 * a file nobody then uses just downloads the font twice.
 *
 * They are `<link>` elements and not `ReactDOM.preload()` calls on purpose:
 * on a dynamic route the preload call left the hint in the flight payload,
 * where the browser reads it after the scripts, which is later than the
 * stylesheet would have told it anyway. React hoists these into the head of
 * the first response instead.
 */
const PRELOAD_FONTS = [
  new URL('../../../packages/ui-tokens/fonts/ibm-plex-sans-400-latin.woff2', import.meta.url).href,
  new URL('../../../packages/ui-tokens/fonts/ibm-plex-sans-600-latin.woff2', import.meta.url).href,
]

export const metadata: Metadata = {
  title: copy.brand.name,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {PRELOAD_FONTS.map((href) => (
          <link
            key={href}
            rel="preload"
            as="font"
            type="font/woff2"
            href={href}
            crossOrigin="anonymous"
          />
        ))}
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  )
}
