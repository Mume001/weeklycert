import { copy } from '@wc/copy'

// 404, also for a company the user does not belong to (spec/11 §6). Text: spec/15 §3.
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <p className="max-w-md text-center text-base text-text-secondary">{copy.errors.notFound}</p>
    </main>
  )
}
