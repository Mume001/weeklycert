'use client'

// The pages behind an emailed link (spec/03 §4.1): opening one never uses its
// token (mail scanners open links); the button does, with a POST.
import { copy, fill } from '@wc/copy'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DemoLink } from './AuthCard'
import {
  confirmEmailAction,
  consumeMagicLinkAction,
  resetPasswordAction,
  sendLinkAction,
} from './actions'

const t = copy.auth

/** A link that has expired or was used, and the way to a new one. */
export function LinkInvalid({ again }: { again: string }) {
  return (
    <div role="alert" className="grid gap-3">
      <p className="text-sm font-semibold text-error-600">{t.linkInvalid}</p>
      <div>
        <Button asChild variant="secondary">
          <Link href={again}>{t.sendNewLink}</Link>
        </Button>
      </div>
    </div>
  )
}

export function MagicForm({ token }: { token: string }) {
  const [pending, start] = useTransition()
  const [used, setUsed] = useState(false)
  if (used) return <LinkInvalid again="/login" />
  return (
    <div className="grid gap-3">
      <p className="text-sm text-text-secondary">{t.magicLink}</p>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await consumeMagicLinkAction(token)
            if (!result.ok) setUsed(true)
          })
        }
      >
        {t.magic.submit}
      </Button>
    </div>
  )
}

export function VerifyForm({ token }: { token: string }) {
  const [pending, start] = useTransition()
  const [state, setState] = useState<'ready' | 'done' | 'invalid'>('ready')
  if (state === 'invalid') return <LinkInvalid again="/login" />
  if (state === 'done') {
    return (
      <div role="status" className="grid gap-3">
        <p className="text-sm text-text-primary">{t.verify.done}</p>
        <div>
          <Button asChild>
            <Link href="/app">{t.verify.continue}</Link>
          </Button>
        </div>
      </div>
    )
  }
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          setState((await confirmEmailAction(token)).ok ? 'done' : 'invalid')
        })
      }
    >
      {t.verify.submit}
    </Button>
  )
}

export function ResetForm({ token }: { token: string }) {
  const [pending, start] = useTransition()
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'ready' | 'short' | 'done' | 'invalid'>('ready')
  if (state === 'invalid') return <LinkInvalid again="/forgot" />
  if (state === 'done') {
    return (
      <div role="status" className="grid gap-3">
        <p className="text-sm text-text-primary">{t.reset.done}</p>
        <div>
          <Button asChild>
            <Link href="/login">{t.signIn}</Link>
          </Button>
        </div>
      </div>
    )
  }
  const error = state === 'short' ? t.register.errors.passwordShort : undefined
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const result = await resetPasswordAction(token, password)
          setState(result.ok ? 'done' : result.error === 'passwordShort' ? 'short' : 'invalid')
        })
      }}
    >
      <FormField
        id="reset-password"
        label={t.reset.password}
        hint={t.register.passwordHint}
        error={error}
      >
        <Input
          {...fieldIds('reset-password', t.register.passwordHint, error)}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={pending}>
        {t.reset.submit}
      </Button>
    </form>
  )
}

export function ForgotForm() {
  const [pending, start] = useTransition()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<{ email: string; token: string } | null>(null)
  if (sent) {
    return (
      <div role="status" className="grid gap-2 text-sm text-text-secondary">
        {fill(t.forgot.sent, { email: sent.email })}
        <DemoLink href={`/reset/${sent.token}`} />
      </div>
    )
  }
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => setSent(await sendLinkAction('reset', email)))
      }}
    >
      <FormField id="forgot-email" label={t.fields.email}>
        <Input
          {...fieldIds('forgot-email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={pending || email.trim() === ''}>
        {t.forgot.submit}
      </Button>
    </form>
  )
}
