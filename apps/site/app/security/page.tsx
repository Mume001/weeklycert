import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { Cta } from '@/components/Cta'
import { SecurityList } from '@/components/SecurityList'

export const metadata: Metadata = {
  title: `${copy.shell.user.security} · ${copy.brand.name}`,
  description: copy.site.security.title,
}

/**
 * spec/03 §2 and 19 §2: /security. This is the page a general contractor's risk
 * team is sent, so it is the same list as the home page and nothing extra.
 */
export default function SecurityPage() {
  return (
    <>
      <SecurityList level={1} />
      <Cta />
    </>
  )
}
