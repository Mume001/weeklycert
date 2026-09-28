// Where the public legal pages live (spec/03 §2: /legal/terms, /legal/privacy
// on the site). The texts come in step 8b (spec/12).
import { copy, fill } from '@wc/copy'

export const SITE_URL = 'https://weeklycert.com'
export const LEGAL_URLS = {
  terms: `${SITE_URL}/legal/terms`,
  privacy: `${SITE_URL}/legal/privacy`,
} as const

/** The SMS consent exactly as the user reads it, and as it is kept on record (spec/11, TCPA). */
export function smsConsentText(): string {
  return fill(copy.settings.notifications.channels.consent, {
    termsUrl: LEGAL_URLS.terms,
    privacyUrl: LEGAL_URLS.privacy,
  })
}
