import { copy } from '@wc/copy'
import { supportMailto } from './links'

/** spec/16 §4 row 14: the last call, the same one action as the hero. */
export function Cta() {
  const c = copy.site.cta
  return (
    <section className="bg-teal-800 px-6 py-16 text-center text-white">
      <div className="mx-auto max-w-[1160px]">
        <h2 className="font-semibold text-3xl text-white">{c.title}</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-lg text-teal-100">{c.body}</p>
        <a
          className="mt-7 inline-flex h-12 items-center rounded-md bg-white px-6 font-semibold text-md text-n-900 no-underline hover:bg-n-50"
          href={supportMailto(copy.site.signup.subject)}
        >
          {copy.site.signup.button}
        </a>
        <p className="mt-3 text-sm text-teal-100">{copy.site.signup.note}</p>
      </div>
    </section>
  )
}
