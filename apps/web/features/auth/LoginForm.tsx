'use client'

// /login (spec/03 §4.1): email and password, a sign-in link, or a passkey.
// A wrong email and a wrong password get the same sentence.
import { copy, fill } from '@wc/copy'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatClock } from '@/lib/format'
import { DemoLink } from './AuthCard'
import { type SignInState, sendLinkAction, signInAction, twoFactorAction } from './actions'

const t = copy.auth

export function LoginForm({ lockedUntil }: { lockedUntil?: string }) {
  const [pending, start] = useTransition()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<SignInState>(
    lockedUntil ? { error: 'locked', until: lockedUntil } : { error: null },
  )
  const [link, setLink] = useState<{ email: string; href: string } | null>(null)
  const [resent, setResent] = useState<string | null>(null)
  const [passkey, setPasskey] = useState(false)

  const message =
    state.error === 'mismatch'
      ? t.failed
      : state.error === 'locked'
        ? fill(t.tooManyAttempts, { time: formatClock(state.until) })
        : state.error === 'unverified'
          ? fill(t.unverified, { email: state.email })
          : null

  return (
    <div className="grid gap-4">
      <p className="rounded-md bg-n-50 px-3 py-2 text-xs text-text-secondary">{t.demo}</p>
      {message && (
        <div
          role="alert"
          className="grid gap-2 rounded-md border border-error-100 bg-error-50 px-3 py-2"
        >
          <p className="text-sm font-semibold text-error-600">{message}</p>
          {state.error === 'unverified' && (
            <div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  start(async () => {
                    const sent = await sendLinkAction('verify', state.email)
                    setResent(`/verify/${sent.token}`)
                  })
                }
              >
                {t.resend}
              </Button>
            </div>
          )}
          {resent && (
            <>
              <p className="text-sm">{t.resent}</p>
              <DemoLink href={resent} />
            </>
          )}
        </div>
      )}
      <form
        className="grid gap-3"
        action={(form) =>
          start(async () => {
            setLink(null)
            setResent(null)
            setState(await signInAction(form))
          })
        }
      >
        <FormField id="login-email" label={t.fields.email}>
          <Input
            {...fieldIds('login-email')}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField id="login-password" label={t.fields.password}>
          <Input
            {...fieldIds('login-password')}
            name="password"
            type="password"
            autoComplete="current-password"
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remember" className="size-4 accent-brand" />
          {t.fields.remember}
        </label>
        <Button type="submit" disabled={pending}>
          {t.signIn}
        </Button>
      </form>
      <div className="grid gap-2">
        <Button
          variant="secondary"
          disabled={pending || email.trim() === ''}
          onClick={() =>
            start(async () => {
              const sent = await sendLinkAction('magic', email)
              setLink({ email: sent.email, href: `/magic/${sent.token}` })
            })
          }
        >
          {t.emailLink}
        </Button>
        {link && (
          <div role="status" className="text-sm text-text-secondary">
            {fill(t.linkSent, { email: link.email })}
            <DemoLink href={link.href} />
          </div>
        )}
        <Button variant="secondary" onClick={() => setPasskey(true)}>
          {t.passkey}
        </Button>
        {passkey && (
          <p role="status" className="text-sm text-text-secondary">
            {t.passkeyDemo}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <Link href="/forgot" className="text-teal-700 underline underline-offset-2">
          {t.forgotLink}
        </Link>
        <Link href="/register" className="text-teal-700 underline underline-offset-2">
          {t.registerLink}
        </Link>
      </div>
    </div>
  )
}

export function TwoFactorForm() {
  const [pending, start] = useTransition()
  const [failed, setFailed] = useState(false)
  const error = failed ? t.twoFactor.failed : undefined
  return (
    <form
      className="grid gap-3"
      action={(form) =>
        start(async () => {
          setFailed((await twoFactorAction(form)).failed)
        })
      }
    >
      <p className="text-sm text-text-secondary">{t.twoFactor.body}</p>
      <FormField id="twofa-code" label={t.twoFactor.code} error={error}>
        <Input
          {...fieldIds('twofa-code', undefined, error)}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
        />
      </FormField>
      <Button type="submit" disabled={pending}>
        {t.twoFactor.submit}
      </Button>
    </form>
  )
}
