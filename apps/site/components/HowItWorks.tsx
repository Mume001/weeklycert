import { copy } from '@wc/copy'
import { Section, SectionHead } from './Section'

/** spec/16 §4 row 6: three steps, one sentence each. */
export function HowItWorks() {
  const c = copy.site.how
  return (
    <Section id="how">
      <SectionHead eyebrow={c.eyebrow} title={c.title} lede={c.lede} />
      <ol className="mt-8 grid list-none gap-5 p-0 md:grid-cols-3">
        {c.steps.map((step, index) => (
          <li className="rounded-lg border border-border-decorative bg-white p-6" key={step.title}>
            <span className="mb-3 grid size-7 place-items-center rounded-full bg-teal-50 font-semibold text-sm text-teal-700">
              {index + 1}
            </span>
            <h3 className="font-semibold text-md">{step.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
