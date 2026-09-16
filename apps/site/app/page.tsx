import { About } from '@/components/About'
import { Compare } from '@/components/Compare'
import { Cta } from '@/components/Cta'
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
 * Two of the fifteen rows render nothing, and that is the specification and not
 * an omission:
 *   row 7, the interactive demo, arrives when the grid can be embedded on mock
 *   data (19 §8, 16 §4); it is not a video and not a form;
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
      <Compare />
      <PriceTable />
      <SecurityList />
      <Faq />
      <About />
      <Cta />
    </>
  )
}
