import { About } from '@/components/About'
import { Compare } from '@/components/Compare'
import { Cta } from '@/components/Cta'
import { Demo } from '@/components/Demo'
import { Faq } from '@/components/Faq'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { PriceTable } from '@/components/PriceTable'
import { ProofRow } from '@/components/ProofRow'
import { SecurityList } from '@/components/SecurityList'
import { Stakes } from '@/components/Stakes'
import { WhatYouGet } from '@/components/WhatYouGet'

/**
 * The home page, in the order of spec/16 §4.
 *
 * Row 7 is the interactive demo (session O): the grid on mock data with the
 * real engine, no video and no form.
 *
 * One of the fifteen rows renders nothing, and that is the specification and
 * not an omission:
 *   row 11, testimonials and badges, stays empty until real customers agree to
 *   be quoted (16 §4 row 11, 16 §6). An empty space is honest; a placeholder
 *   that says "coming soon" is an admission dressed as a feature.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProofRow />
      <WhatYouGet />
      <Stakes />
      <HowItWorks />
      <Demo />
      <Compare />
      <PriceTable />
      <SecurityList />
      <Faq />
      <About />
      <Cta />
    </>
  )
}
