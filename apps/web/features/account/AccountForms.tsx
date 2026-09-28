'use client'

// /account and /account/security (spec/03 §4.2).
import { copy, fill } from '@wc/copy'
import type { AccountDTO } from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormField, fieldIds } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatClock, formatDate } from '@/lib/format'
import {
  changePasswordAction,
  saveProfileAction,
  signOutEverywhereAction,
  signOutSessionAction,
} from './actions'

const a = copy.account
const s = a.security
const card = 'grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm'

export function ProfileForm({ account }: { account: AccountDTO }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState(account.name)
  const [email, setEmail] = useState(account.email)
  const [message, setMessage] = useState<string | null>(null)
  return (
    <form
      className={card}
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const result = await saveProfileAction({ name, email })
          if (!result.ok) return
          setMessage(
            result.emailSentTo ? fill(a.emailSent, { email: result.emailSentTo }) : a.saved,
          )
          router.refresh()
        })
      }}
    >
      <FormField id="account-name" label={a.name}>
        <Input
          {...fieldIds('account-name')}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <FormField id="account-email" label={a.email} hint={a.emailHint}>
        <Input
          {...fieldIds('account-email', a.emailHint)}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField id="account-language" label={a.language}>
        <Input id="account-language" value={a.english} readOnly className="bg-n-50 text-n-700" />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {copy.buttons.save}
        </Button>
        <span role="status" className="text-sm text-text-secondary">
          {message ?? ''}
        </span>
      </div>
    </form>
  )
}

export function PasswordForm() {
  const [pending, start] = useTransition()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [state, setState] = useState<'ready' | 'wrong' | 'short' | 'done'>('ready')
  const currentError = state === 'wrong' ? s.wrong : undefined
  const nextError = state === 'short' ? copy.auth.register.errors.passwordShort : undefined
  return (
    <form
      noValidate
      className={card}
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const result = await changePasswordAction(current, next)
          setState(result.ok ? 'done' : result.error)
          if (result.ok) {
            setCurrent('')
            setNext('')
          }
        })
      }}
    >
      <h2 className="text-md font-semibold text-text-primary">{s.password}</h2>
      <FormField id="pw-current" label={s.current} error={currentError}>
        <Input
          {...fieldIds('pw-current', undefined, currentError)}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </FormField>
      <FormField
        id="pw-next"
        label={s.next}
        hint={copy.auth.register.passwordHint}
        error={nextError}
      >
        <Input
          {...fieldIds('pw-next', copy.auth.register.passwordHint, nextError)}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {s.change}
        </Button>
        <span role="status" className="text-sm text-text-secondary">
          {state === 'done' ? s.changed : ''}
        </span>
      </div>
    </form>
  )
}

export function SessionsList({ sessions }: { sessions: AccountDTO['sessions'] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  return (
    <section className={card}>
      <h2 className="text-md font-semibold text-text-primary">{s.sessions}</h2>
      <div className="overflow-hidden rounded-md border border-border-decorative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{s.device}</TableHead>
              <TableHead>{s.lastActive}</TableHead>
              <TableHead>
                <span className="sr-only">{s.signOut}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((x) => (
              <TableRow key={x.id} data-testid="session-row">
                <TableCell id={`device-${x.id}`}>
                  {x.device}
                  {x.current && (
                    <span className="ml-2 text-xs font-semibold text-text-secondary">
                      {s.thisDevice}
                    </span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(x.lastActive.slice(0, 10))} {formatClock(x.lastActive)}
                </TableCell>
                <TableCell className="text-right">
                  {!x.current && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      aria-describedby={`device-${x.id}`}
                      onClick={() =>
                        start(async () => {
                          await signOutSessionAction(x.id)
                          router.refresh()
                        })
                      }
                    >
                      {s.signOut}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await signOutEverywhereAction()
              setDone(true)
              router.refresh()
            })
          }
        >
          {s.signOutEverywhere}
        </Button>
        <span role="status" className="text-sm text-text-secondary">
          {done ? s.signedOut : ''}
        </span>
      </div>
    </section>
  )
}
