import { copy } from '@wc/copy'
import { APP_URL, SECTION } from './links'

/**
 * spec/16 §4 row 1. The human option in the header is an email address and not
 * a phone number, and stays that way until a real number exists that somebody
 * answers (spec/19 §8, spec/16 §4 rows 1, 13 and 15).
 *
 * Section links are absolute (`/#how`), so they work from /pricing and
 * /security as well as from the home page.
 */
export function SiteNav() {
  const c = copy.site.nav
  return (
    <header className="sticky top-0 z-50 border-border-decorative border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[62px] max-w-[1160px] items-center gap-6 px-6">
        <a href="/" className="font-semibold text-md text-text-primary tracking-tight no-underline">
          {copy.brand.name}
        </a>
        <nav className="hidden gap-5 text-sm md:flex">
          <a className="font-medium text-n-700 no-underline hover:text-teal-700" href={SECTION.how}>
            {c.how}
          </a>
          <a
            className="font-medium text-n-700 no-underline hover:text-teal-700"
            href={SECTION.output}
          >
            {c.output}
          </a>
          <a className="font-medium text-n-700 no-underline hover:text-teal-700" href="/pricing">
            {c.pricing}
          </a>
          <a className="font-medium text-n-700 no-underline hover:text-teal-700" href={SECTION.faq}>
            {c.questions}
          </a>
          <a
            className="font-medium text-n-700 no-underline hover:text-teal-700"
            href={SECTION.about}
          >
            {c.about}
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <a
            className="hidden font-semibold text-n-800 text-sm no-underline sm:inline"
            href={`mailto:${c.contact}`}
          >
            {c.contact}
          </a>
          <a
            className="hidden h-[30px] items-center rounded-md px-3 font-semibold text-n-800 text-sm no-underline hover:bg-n-50 sm:inline-flex"
            href={APP_URL}
          >
            {c.logIn}
          </a>
          <a
            className="inline-flex h-[30px] items-center rounded-md bg-brand px-3 font-semibold text-sm text-white no-underline hover:bg-brand-hover"
            href="/pricing"
          >
            {c.startFree}
          </a>
        </div>
      </div>
    </header>
  )
}
