'use client'

// /register (spec/03 §4.1). With ?invite= there is no company name: the
// account joins the company that invited it.
import { copy, fill } from '@wc/copy'
import type { RegisterErrorCode } from '@wc/data/dto'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DemoLink } from './AuthCard'
import { registerAction } from './actions'

const r = copy.auth.register

export function RegisterForm({
  invitation,
  invitedEmail,
  invitedCompany,
}: {
  invitation: string
  invitedEmail: string
  invitedCompany: string | null
}) {
  const [pending, start] = useTransition()
  const [values, setValues] = useState({
    name: '',
    email: invitedEmail,
    password: '',
    company: '',
    terms: false,
  })
  const [errors, setErrors] = useState<Record<string, RegisterErrorCode>>({})
  const [done, setDone] = useState<{ email: string; token: string } | null>(null)
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }))
  const error = (field: string) => {
    const code = errors[field]
    return code ? r.errors[code] : undefined
  }

  if (done) {
    return (
      <div role="status" className="grid gap-2">
        <h2 className="text-md font-semibold text-text-primary">{r.checkTitle}</h2>
        <p className="text-sm text-text-secondary">{fill(r.checkBody, { email: done.email })}</p>
        <DemoLink href={`/verify/${done.token}`} />
      </div>
    )
  }

  const text = (
    field: 'name' | 'email' | 'password' | 'company',
    label: string,
    extra: { type?: string; autoComplete?: string; hint?: string } = {},
  ) => (
    <FormField id={`reg-${field}`} label={label} hint={extra.hint} error={error(field)}>
      <Input
        {...fieldIds(`reg-${field}`, extra.hint, error(field))}
        type={extra.type ?? 'text'}
        autoComplete={extra.autoComplete}
        value={values[field]}
        readOnly={field === 'email' && invitedEmail !== ''}
        onChange={(e) => set({ [field]: e.target.value })}
      />
    </FormField>
  )

  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const result = await registerAction(values, invitation)
          if (!result.ok) {
            setErrors(result.errors)
            return
          }
          setErrors({})
          setDone({ email: result.email, token: result.token })
        })
      }}
    >
      {invitedCompany && (
        <p className="rounded-md bg-info-50 px-3 py-2 text-sm text-info-600">
          {fill(r.joining, { Company: invitedCompany })}
        </p>
      )}
      {text('name', r.name, { autoComplete: 'name' })}
      {text('email', r.email, { type: 'email', autoComplete: 'email' })}
      {errors.email === 'emailTaken' && (
        <Link href="/login" className="text-sm text-teal-700 underline underline-offset-2">
          {r.signInInstead}
        </Link>
      )}
      {text('password', r.password, {
        type: 'password',
        autoComplete: 'new-password',
        hint: r.passwordHint,
      })}
      {!invitedCompany && (
        <>
          {text('company', r.company, { autoComplete: 'organization' })}
          <FormField id="reg-state" label={r.state}>
            <Input id="reg-state" value={r.newYork} readOnly className="bg-n-50 text-n-700" />
          </FormField>
        </>
      )}
      <div className="grid gap-1">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.terms}
            onChange={(e) => set({ terms: e.target.checked })}
            aria-invalid={error('terms') ? true : undefined}
            aria-describedby={error('terms') ? 'reg-terms-error' : undefined}
            className="mt-0.5 size-4 shrink-0 accent-brand"
          />
          {r.terms}
        </label>
        {error('terms') && (
          <p id="reg-terms-error" className="text-xs font-semibold text-error-600">
            {error('terms')}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {r.submit}
      </Button>
      <Link href="/login" className="text-sm text-teal-700 underline underline-offset-2">
        {r.signInLink}
      </Link>
    </form>
  )
}
