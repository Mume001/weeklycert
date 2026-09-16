import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { Cta } from '@/components/Cta'
import { Faq } from '@/components/Faq'
import { PriceTable } from '@/components/PriceTable'

export const metadata: Metadata = {
  title: `${copy.site.nav.pricing} · ${copy.brand.name}`,
  description: copy.site.pricing.note,
}

/** spec/03 §2 and 19 §2: /pricing. The price is the page, then the objections. */
export default function PricingPage() {
  return (
    <>
      <PriceTable level={1} />
      <Faq />
      <Cta />
    </>
  )
}
