import { copy } from '@wc/copy'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 13: this section is about the company, not about a person.
 * No name, no face, no initials and no location of the owner, and nothing
 * invented to fill the space they left: no team size, no office, no address.
 *
 * What stays is what a general contractor's risk team actually asks: what this
 * company does, who answers the email, where the data sits, and when somebody
 * is reachable. The contact is the support inbox until a real phone number
 * exists that somebody answers (19 §8 item 2).
 */
export function About() {
  const c = copy.site.about
  return (
    <Section id="about">
      <SectionHead eyebrow={c.eyebrow} title={c.title} />
      <div className="mt-6 rounded-lg border border-border-decorative bg-white p-6">
        <p className="max-w-[760px] text-sm text-text-secondary">{c.body}</p>
        <dl className="mt-5 flex flex-wrap gap-7 text-sm">
          {c.facts.map((fact) => (
            <div key={fact.term}>
              <dt className="font-semibold">{fact.term}</dt>
              <dd className="m-0 text-text-secondary">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  )
}
