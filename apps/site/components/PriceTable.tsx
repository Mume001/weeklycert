import { copy } from '@wc/copy'
import { Check } from './Check'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 9. The price is published, which 16 §2 found is the whole
 * difference between the tools that sell themselves and the tools that sell
 * through a discovery call. A hidden price next to $79 is the worst of both.
 */
export function PriceTable({ level = 2 }: { level?: 1 | 2 }) {
  const c = copy.site.pricing
  return (
    <Section id="pricing" tone="dark">
      <SectionHead eyebrow={c.eyebrow} title={c.title} lede={c.lede} dark level={level} />
      <div className="mt-9 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg bg-white p-7 text-text-primary">
          <p className="font-semibold text-teal-700 text-xs uppercase tracking-widest">
            {c.planName}
          </p>
          <p className="mt-3 font-semibold text-4xl leading-none tracking-tight">
            {c.amount}
            <span className="ml-2 font-normal text-md text-text-secondary">{c.period}</span>
          </p>
          <p className="mt-3 text-sm text-text-secondary">{c.note}</p>
          <ul className="mt-5 flex list-none flex-col gap-2.5 p-0 text-sm">
            {c.includes.map((line) => (
              <li className="flex items-start gap-2.5" key={line}>
                <span className="mt-1">
                  <Check />
                </span>
                {line}
              </li>
            ))}
          </ul>
          <a
            className="mt-6 flex h-12 items-center justify-center rounded-md bg-brand px-6 font-semibold text-md text-white no-underline hover:bg-brand-hover"
            href="/pricing"
          >
            {c.cta}
          </a>
          <p className="mt-2.5 text-center text-text-secondary text-xs">{c.ctaNote}</p>
        </div>

        <div className="rounded-lg border border-white/15 bg-white/5 p-6">
          <h3 className="font-semibold text-lg text-white">{c.setupTitle}</h3>
          <p className="mt-2 text-n-400 text-sm">{c.setupBody}</p>
          <div className="mt-5 overflow-hidden rounded-md border border-white/15">
            {c.tiers.map((tier) => (
              <div
                className="flex justify-between gap-4 border-white/10 border-b bg-white/5 px-4 py-3 text-sm last:border-b-0"
                key={tier.name}
              >
                <span>
                  <span className="font-semibold text-white">{tier.name}</span>
                  <span className="block text-n-400 text-xs">{tier.detail}</span>
                </span>
                <span className="font-semibold text-white">{tier.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-n-400 text-sm">{c.guarantee}</p>
        </div>
      </div>
    </Section>
  )
}
