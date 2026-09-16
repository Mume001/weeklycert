import { copy } from '@wc/copy'

/**
 * The home page sections, written absolute so a link works from /pricing and
 * /security too. The ids are set on the sections themselves.
 */
export const SECTION = {
  how: '/#how',
  output: '/#output',
  faq: '/#faq',
  about: '/#about',
} as const

/** The three legal documents, and the only ones (spec/19 §2, spec/16 §4 row 15). */
export const LEGAL_DOCS = ['terms', 'privacy', 'dpa'] as const

export type LegalDoc = (typeof LEGAL_DOCS)[number]

/**
 * Where a call to action goes while there is nothing to sign up to.
 *
 * `app.weeklycert.com` is built after the gate of ten payments (spec/19 §9) and
 * `/register` is a screen in `apps/web` that does not exist yet either, so
 * every button that used to promise one now opens an email to the address the
 * header already shows (spec/15 §3 block 14). The subject says which button was
 * pressed, because the same inbox answers all of them.
 */
export function supportMailto(subject: string): string {
  return `mailto:${copy.site.nav.contact}?subject=${encodeURIComponent(subject)}`
}
