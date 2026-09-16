import type { ReactNode } from 'react'

/** One section of the page, at the one measure the whole site uses. */
export function Section({
  id,
  tone = 'plain',
  children,
}: {
  id?: string
  /** `sunken` is the n-50 band 16 §4 alternates with white. */
  tone?: 'plain' | 'sunken' | 'dark'
  children: ReactNode
}) {
  const skin =
    tone === 'sunken'
      ? 'border-border-decorative border-y bg-surface-sunken'
      : tone === 'dark'
        ? 'bg-n-900 text-white'
        : 'bg-white'
  return (
    <section {...(id ? { id } : {})} className={`px-6 py-16 ${skin}`}>
      <div className="mx-auto max-w-[1160px]">{children}</div>
    </section>
  )
}

/**
 * The eyebrow, heading and lede every section opens with (spec/14 §4).
 *
 * `level` exists because two sections are also whole pages: on the home page
 * the price and the security list are h2 under the hero's h1, and on /pricing
 * and /security they ARE the page and have to carry its h1. Without it those
 * two pages ship with no top level heading at all, which is what the Playwright
 * run caught.
 */
export function SectionHead({
  eyebrow,
  title,
  lede,
  dark = false,
  level = 2,
}: {
  eyebrow?: string
  title: string
  lede?: string
  dark?: boolean
  level?: 1 | 2
}) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <>
      {eyebrow && (
        <p
          className={`mb-3 font-semibold text-xs uppercase tracking-widest ${
            dark ? 'text-teal-300' : 'text-teal-600'
          }`}
        >
          {eyebrow}
        </p>
      )}
      <Heading className={`font-semibold text-3xl ${dark ? 'text-white' : 'text-text-primary'}`}>
        {title}
      </Heading>
      {lede && (
        <p className={`mt-3 max-w-[660px] text-lg ${dark ? 'text-n-400' : 'text-text-secondary'}`}>
          {lede}
        </p>
      )}
    </>
  )
}
