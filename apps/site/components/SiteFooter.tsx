import { copy } from '@wc/copy'
import { SECTION } from './links'

/**
 * spec/16 §4 row 15. No postal address and no phone number: neither exists yet,
 * and an invented address on a site that sells a compliance service is a legal
 * problem, not a placeholder (16 §4 row 13, 19 §8).
 *
 * The "New York guides" group of 16 §7 is not here: those five pages are
 * written after launch, and a footer link to a page that does not exist is a
 * 404 in the only place a search engine looks first.
 */
export function SiteFooter() {
  const c = copy.site.footer
  const legal = copy.site.legal
  return (
    <footer className="bg-n-900 px-6 py-12 text-n-400 text-sm">
      <div className="mx-auto max-w-[1160px]">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="font-semibold text-md text-white">{copy.brand.name}</p>
            <p className="mt-3 max-w-[300px]">{c.description}</p>
            <p className="mt-4">
              <a
                className="text-n-300 no-underline hover:text-white"
                href={`mailto:${legal.contact}`}
              >
                {legal.contact}
              </a>
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-white text-xs uppercase tracking-widest">
              {c.product}
            </h2>
            <ul className="flex list-none flex-col gap-2 p-0">
              <li>
                <a className="text-n-300 no-underline hover:text-white" href={SECTION.how}>
                  {copy.site.nav.how}
                </a>
              </li>
              <li>
                <a className="text-n-300 no-underline hover:text-white" href={SECTION.output}>
                  {copy.site.nav.output}
                </a>
              </li>
              <li>
                <a className="text-n-300 no-underline hover:text-white" href="/pricing">
                  {copy.site.nav.pricing}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-white text-xs uppercase tracking-widest">
              {c.company}
            </h2>
            <ul className="flex list-none flex-col gap-2 p-0">
              <li>
                <a className="text-n-300 no-underline hover:text-white" href={SECTION.about}>
                  {copy.site.nav.about}
                </a>
              </li>
              <li>
                <a className="text-n-300 no-underline hover:text-white" href="/security">
                  {copy.shell.user.security}
                </a>
              </li>
              <li>
                <a className="text-n-300 no-underline hover:text-white" href="/legal/terms">
                  {legal.terms}
                </a>
              </li>
              <li>
                <a className="text-n-300 no-underline hover:text-white" href="/legal/privacy">
                  {legal.privacy}
                </a>
              </li>
              <li>
                <a className="text-n-300 no-underline hover:text-white" href="/legal/dpa">
                  {legal.dpa}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-4 border-white/10 border-t pt-5 text-xs">
          <span>{c.legalLine}</span>
          <span>{c.lastLine}</span>
        </div>
      </div>
    </footer>
  )
}
