import { copy } from '@wc/copy'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 13. No phone number and no postal address: both were invented
 * in the prototype, and an invented address on a site selling a compliance
 * service is a legal problem rather than a placeholder (19 §8 item 2). The
 * contact is the support inbox until a real number exists that somebody answers.
 */
export function About() {
  const c = copy.site.about
  return (
    <Section id="about">
      <SectionHead eyebrow={c.eyebrow} title={c.title} />
      <div className="mt-6 grid gap-6 rounded-lg border border-border-decorative bg-white p-6 sm:grid-cols-[auto_1fr]">
        <p className="grid size-20 place-items-center rounded-lg bg-teal-700 font-semibold text-2xl text-white">
          {initials(c.name)}
        </p>
        <div>
          <h3 className="font-semibold text-lg">{c.name}</h3>
          <p className="text-sm text-text-secondary">{c.role}</p>
          <p className="mt-3 text-sm text-text-secondary">{c.body}</p>
          <dl className="mt-5 flex flex-wrap gap-7 text-sm">
            {c.facts.map((fact) => (
              <div key={fact.term}>
                <dt className="font-semibold">{fact.term}</dt>
                <dd className="m-0 text-text-secondary">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  )
}

/** Derived from the name, so the avatar can never disagree with it. */
function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
}
