'use client'

// Time zone and logo (spec/03 §4.9), the two things /settings/company has
// that onboarding step 1 does not.
import { copy } from '@wc/copy'
import { TIMEZONES } from '@wc/data/dto'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { saveCompanyExtrasAction } from './actions'

const t = copy.settings.company

export function CompanyExtrasForm({
  slug,
  timezone,
  logo,
  readOnly,
}: {
  slug: string
  timezone: string
  logo: { contentType: string; base64: string } | null
  readOnly: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | undefined>(undefined)
  const [saved, setSaved] = useState(false)

  const submit = (form: FormData) =>
    start(async () => {
      setSaved(false)
      const result = await saveCompanyExtrasAction(slug, form)
      if (!result.ok) {
        setError(t.logo[result.error])
        return
      }
      setError(undefined)
      setSaved(true)
      router.refresh()
    })

  return (
    <form
      action={submit}
      className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <FormField id="company-timezone" label={t.timezone.label} hint={t.timezone.hint}>
        <select
          {...fieldIds('company-timezone', t.timezone.hint)}
          name="timezone"
          defaultValue={timezone}
          disabled={readOnly}
          className={selectClass}
        >
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {t.timezones[zone]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="company-logo" label={t.logo.label} hint={t.logo.hint} error={error}>
        <div className="flex flex-wrap items-center gap-3">
          {logo && (
            // The company's own picture, kept in the mock as data: nothing to optimise.
            <Image
              src={`data:${logo.contentType};base64,${logo.base64}`}
              alt={t.logo.label}
              width={160}
              height={40}
              unoptimized
              className="h-10 w-auto max-w-40 rounded border border-border-decorative object-contain"
            />
          )}
          {!readOnly && (
            <input
              {...fieldIds('company-logo', t.logo.hint, error)}
              type="file"
              name="logo"
              accept="image/png,image/jpeg"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-border-interactive file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-n-800"
            />
          )}
        </div>
      </FormField>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {copy.buttons.save}
          </Button>
          {logo && (
            <Button
              type="submit"
              name="removeLogo"
              value="1"
              variant="secondary"
              disabled={pending}
            >
              {t.logo.remove}
            </Button>
          )}
          <span role="status" className="text-sm text-text-secondary">
            {saved ? t.saved : ''}
          </span>
        </div>
      )}
    </form>
  )
}
