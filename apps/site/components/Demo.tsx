import { copy } from '@wc/copy'
import { DemoLoader } from './DemoLoader'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 7: the interactive demo. No form, desktop first, the real
 * engine on one made-up week; it ends on the review of the week (20 O).
 */
export function Demo() {
  const d = copy.site.demo
  return (
    <Section id="demo" tone="sunken">
      <SectionHead eyebrow={d.eyebrow} title={d.title} lede={d.lede} />
      <p className="mt-4 inline-block rounded-full border border-border-decorative bg-white px-3 py-1 text-xs font-semibold text-text-secondary">
        {d.label}
      </p>
      <div className="mt-6">
        <DemoLoader />
      </div>
    </Section>
  )
}
