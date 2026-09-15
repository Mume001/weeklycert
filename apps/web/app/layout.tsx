import './globals.css'
import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'

// IBM Plex Sans and Mono are self-hosted by @wc/ui-tokens (spec/14 §4, spec/19 §8).
export const metadata: Metadata = {
  title: copy.brand.name,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  )
}
