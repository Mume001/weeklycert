'use client'

// "Sign and lock this week" (spec/03 §4.5). The statement is the form's text
// (spec/05 §4.4, in packages/core), the ticks come from the data, and signing
// asks for the password or the code again, because the session is not enough
// (spec/02 §4 rule 6).
import { copy } from '@wc/copy'
import type { AttestationPoint } from '@wc/core'
import type { SignErrors, SignerDTO } from '@wc/data/dto'
import { Check, Minus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signAction } from './actions'

const s = copy.sign

interface Values {
  fullName: string
  title: string
  phone: string
  email: string
  reauth: string
}

export function SignForm({
  slug,
  periodId,
  signer,
  points,
  reportsHref,
}: {
  slug: string
  periodId: string
  signer: SignerDTO
  points: AttestationPoint[]
  reportsHref: string
}) {
  const router = useRouter()
  const [errors, setErrors] = useState<SignErrors>({})
  const [understood, setUnderstood] = useState(false)
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const { register, handleSubmit, formState } = useForm<Values>({
    defaultValues: {
      fullName: signer.fullName,
      title: signer.title,
      phone: signer.phone,
      email: signer.email,
      reauth: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await signAction(slug, periodId, { ...values, understood })
    if (result.ok) {
      router.push(reportsHref)
      return
    }
    setErrors(result.errors)
    requestAnimationFrame(() => summaryRef.current?.focus())
  })

  const message = (field: string) => {
    const code = errors[field]
    return code ? s.errors[code] : undefined
  }

  const field = (name: keyof Values, label: string, type = 'text') => {
    const id = `sign-${name}`
    const error = message(name)
    return (
      <FormField id={id} label={label} error={error}>
        <Input {...fieldIds(id, undefined, error)} type={type} {...register(name)} />
      </FormField>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <section className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{s.statement}</h2>
          <p className="text-sm text-text-secondary">{s.statementNote}</p>
        </div>
        <ol className="grid gap-3">
          {points.map((point) => (
            <li key={point.number} className="flex gap-3">
              <span
                aria-hidden="true"
                className={
                  point.checked
                    ? 'mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm bg-brand text-white'
                    : 'mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border border-n-300 text-n-500'
                }
              >
                {point.checked ? <Check className="size-3" /> : <Minus className="size-3" />}
              </span>
              <span className={point.checked ? 'text-sm' : 'text-sm text-text-secondary'}>
                {point.text}
                <span className="mt-0.5 block text-xs font-semibold text-text-secondary">
                  {point.checked
                    ? s.reasons[point.reason]
                    : point.reason === 'apprentices'
                      ? s.notTicked.apprentices
                      : s.notTicked.fringe}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2">
        {field('fullName', s.fields.fullName)}
        {field('title', s.fields.title)}
        {field('phone', s.fields.phone, 'tel')}
        {field('email', s.fields.email, 'email')}
      </section>

      <section className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
        <p className="text-sm text-text-secondary">{s.criminalWarning}</p>
        <p className="text-sm text-text-secondary">{copy.review.signatureWarning}</p>
        <div className="flex items-start gap-2.5">
          <input
            id="sign-understood"
            type="checkbox"
            checked={understood}
            aria-invalid={errors.understood ? true : undefined}
            aria-describedby={errors.understood ? 'sign-understood-error' : undefined}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 size-4 accent-brand focus-visible:focus-ring"
          />
          <div>
            <label htmlFor="sign-understood" className="text-sm font-semibold text-n-800">
              {s.understand}
            </label>
            {message('understood') && (
              <p id="sign-understood-error" className="text-xs font-semibold text-error-600">
                {message('understood')}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-[320px]">
          <FormField
            id="sign-reauth"
            label={copy.review.reauthTitle}
            hint={copy.review.reauthNote}
            error={message('reauth')}
          >
            <Input
              {...fieldIds('sign-reauth', copy.review.reauthNote, message('reauth'))}
              type="password"
              autoComplete="current-password"
              {...register('reauth')}
            />
          </FormField>
        </div>
      </section>

      {Object.keys(errors).length > 0 && (
        <p
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm font-semibold text-error-600 shadow-[inset_3px_0_0_var(--error-500)] focus-visible:focus-ring"
        >
          {Object.values(errors)
            .map((code) => s.errors[code])
            .join(' ')}
        </p>
      )}

      <div>
        <Button type="submit" disabled={formState.isSubmitting}>
          {copy.review.sign}
        </Button>
      </div>
    </form>
  )
}
