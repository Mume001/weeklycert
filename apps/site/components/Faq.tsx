import { copy } from '@wc/copy'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 12 and the eight questions of 16 §5, in that order.
 *
 * `details` and `summary`, so the answers are readable with JavaScript turned
 * off and are in the HTML a search engine gets (16 §8). Question 4 turns a
 * customer away before they pay, on purpose: finding out on day five of setup
 * costs more than the lost sale.
 */
export function Faq() {
  const c = copy.site.faq
  return (
    <Section id="faq" tone="sunken">
      <div className="mx-auto max-w-[840px]">
        <SectionHead eyebrow={c.eyebrow} title={c.title} />
        <div className="mt-7 flex flex-col gap-2.5">
          {c.items.map((item) => (
            <details className="rounded-md border border-border-decorative bg-white" key={item.q}>
              <summary className="cursor-pointer px-5 py-4 font-semibold text-md">{item.q}</summary>
              <p className="px-5 pb-4 text-sm text-text-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}
