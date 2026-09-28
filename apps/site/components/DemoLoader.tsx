'use client'

import dynamic from 'next/dynamic'

/**
 * The engine and the week are a chunk of their own, fetched after the page:
 * the hero's LCP target (16 §8, 1,5 s on 3G) does not carry them.
 */
export const DemoLoader = dynamic(() => import('./DemoGrid'), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" className="h-72 rounded-lg border border-border-decorative bg-white" />
  ),
})
