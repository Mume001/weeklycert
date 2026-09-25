'use client'

import { copy } from '@wc/copy'
import { useRouter } from 'next/navigation'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'

const o = copy.onboarding.fringe.worker

/** Picks the worker whose fringe plans onboarding step 5 shows; the choice is in the URL. */
export function WorkerPicker({
  workers,
  selected,
  hrefFor,
}: {
  workers: { id: string; displayName: string }[]
  selected: string | null
  /** The step's URL with "{id}" standing for the worker. */
  hrefFor: string
}) {
  const router = useRouter()
  return (
    <FormField id="setup-worker" label={o.label} className="max-w-sm">
      <select
        {...fieldIds('setup-worker')}
        value={selected ?? ''}
        onChange={(e) => router.push(hrefFor.replace('{id}', e.target.value))}
        className={selectClass}
      >
        <option value="">{o.none}</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.displayName}
          </option>
        ))}
      </select>
    </FormField>
  )
}
