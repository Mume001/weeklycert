import { copy } from '@wc/copy'
import { Section, SectionHead } from './Section'

/**
 * spec/16 §4 row 4, the section 16 §2 calls the biggest hole in the category.
 *
 * What is NOT here, on purpose: a filled-in WH-347 with invented workers and
 * invented pay, and a download of a sample that does not exist. 19 §8 item 4
 * and 03 §4.1 forbid showing output the product cannot yet produce, and the XML
 * and the WH-347 are generated in step 5. The structure of both is specified in
 * 05 and is shown; the numbers in them are not invented.
 */
export function WhatYouGet() {
  const c = copy.site.output
  return (
    <Section id="output">
      <SectionHead title={c.title} lede={c.lede} eyebrow={copy.site.nav.output} />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {[c.xml, c.wh347].map((doc) => (
          <article
            className="rounded-lg border border-border-decorative bg-white p-6"
            key={doc.title}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-md">{doc.title}</h3>
              <span className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-2xs text-teal-700">
                {doc.tag}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{doc.body}</p>
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm text-text-secondary">{c.note}</p>
    </Section>
  )
}
