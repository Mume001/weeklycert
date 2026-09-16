/** Where the application lives (spec/19 §9: the site and the app are two hosts). */
export const APP_URL = 'https://app.weeklycert.com'

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
