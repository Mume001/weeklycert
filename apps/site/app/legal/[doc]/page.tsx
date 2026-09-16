import { copy } from '@wc/copy'
import { notFound } from 'next/navigation'
import { LEGAL_DOCS, type LegalDoc } from '@/components/links'

/**
 * spec/19 §2: three documents and nothing else. `dynamicParams: false` makes
 * any other path a 404 in the static export instead of an empty page.
 *
 * The documents themselves are NOT written here. 18 §5 sets both the order and
 * the author: the terms start from the Common Paper form, the privacy policy
 * from a generator, the DPA from a template, and an American lawyer reviews all
 * of them for 1.000 to 2.000 $. Generated legal text on a site that sells a
 * compliance product is exactly the risk this product exists to remove.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ doc }))
}

const TITLE: Record<LegalDoc, string> = {
  terms: copy.site.legal.terms,
  privacy: copy.site.legal.privacy,
  dpa: copy.site.legal.dpa,
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params
  const title = TITLE[doc as LegalDoc]
  return title ? { title: `${title} · ${copy.brand.name}` } : {}
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params
  if (!LEGAL_DOCS.includes(doc as LegalDoc)) notFound()
  const c = copy.site.legal

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-[720px]">
        <h1 className="font-semibold text-3xl">{TITLE[doc as LegalDoc]}</h1>
        <p className="mt-5 text-lg text-text-secondary">{c.pending}</p>
        <p className="mt-5">
          <a className="font-semibold text-teal-700" href={`mailto:${c.contact}`}>
            {c.contact}
          </a>
        </p>
      </div>
    </section>
  )
}
