import { copy } from '@wc/copy'
import { Check } from './Check'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 10, the objection that arrives from the general contractor's
 * risk team. It says what we do in plain words. 16 §6 forbids the alternative:
 * a SOC 2 badge we do not have and phrases like "bank-level encryption".
 *
 * The same list is the whole of /security, so it takes its heading level from
 * the page that uses it: h2 under the hero at home, h1 when it is the page.
 */
export function SecurityList({ level = 2 }: { level?: 1 | 2 }) {
  const c = copy.site.security
  return (
    <Section id="security">
      <div className="grid gap-9 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow={c.eyebrow} title={c.title} level={level} />
        </div>
        <ul className="flex list-none flex-col gap-3.5 p-0 text-sm">
          {c.points.map((point) => (
            <li className="flex items-start gap-2.5" key={point}>
              <span className="mt-1">
                <Check />
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Under the list, and not beside it: the sentence says "the list above",
          and in two columns that was simply untrue. */}
      <p className="mt-8 text-sm text-text-secondary">{c.refuse}</p>
    </Section>
  )
}
