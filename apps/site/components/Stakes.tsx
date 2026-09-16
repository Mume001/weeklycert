import { copy } from '@wc/copy'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 5. Credibility, not fear: 16 §4 is explicit that the penalty
 * belongs here as a stake and never in the headline, because fear in a headline
 * reads as a scam and precision reads as competence.
 */
export function Stakes() {
  const c = copy.site.stakes
  return (
    <Section tone="sunken">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <SectionHead eyebrow={c.eyebrow} title={c.title} lede={c.lede} />
          <p className="mt-4 text-sm text-text-secondary">{c.close}</p>
        </div>
        <dl className="overflow-hidden rounded-lg border border-border-decorative bg-white">
          {c.facts.map((fact) => (
            <div
              className="grid gap-3 border-border-decorative border-b px-5 py-3.5 text-sm last:border-b-0 sm:grid-cols-[160px_1fr]"
              key={fact.term}
            >
              <dt className="text-text-secondary">{fact.term}</dt>
              <dd className="m-0 font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  )
}
