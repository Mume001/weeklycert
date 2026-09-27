'use client'

// /settings/signers (spec/03 §4.9): who may sign, with the name and title on
// the certification, and the switch that lets an outside bookkeeper sign here.
import { copy } from '@wc/copy'
import type { SignerErrorCode, SignersDTO } from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
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
import { addSignerAction, setBookkeeperCanSignAction, setSignerActiveAction } from './actions'

const t = copy.settings.signers

export function SignersTable({
  slug,
  signers,
  readOnly,
}: {
  slug: string
  signers: SignersDTO['signers']
  readOnly: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.columns.name}</TableHead>
            <TableHead>{t.columns.title}</TableHead>
            <TableHead>{t.columns.contact}</TableHead>
            <TableHead>{t.columns.status}</TableHead>
            <TableHead>
              <span className="sr-only">{t.deactivate}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signers.map((s) => (
            <TableRow key={s.id} data-testid="signer-row">
              <TableCell id={`signer-${s.id}`} className="font-semibold text-text-primary">
                {s.fullName}
              </TableCell>
              <TableCell>{s.title}</TableCell>
              <TableCell className="text-xs">{s.email}</TableCell>
              <TableCell>{s.isActive ? t.active : t.inactive}</TableCell>
              <TableCell className="text-right">
                {!readOnly && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    aria-describedby={`signer-${s.id}`}
                    onClick={() =>
                      start(async () => {
                        await setSignerActiveAction(slug, s.id, !s.isActive)
                        router.refresh()
                      })
                    }
                  >
                    {s.isActive ? t.deactivate : t.activate}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function AddSignerForm({
  slug,
  candidates,
}: {
  slug: string
  candidates: SignersDTO['candidates']
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [userId, setUserId] = useState(candidates[0]?.userId ?? '')
  const [fullName, setFullName] = useState(candidates[0]?.name ?? '')
  const [title, setTitle] = useState('')
  const [errors, setErrors] = useState<Record<string, SignerErrorCode>>({})
  const nameError = errors.fullName && t.errors[errors.fullName]
  const titleError = errors.title && t.errors[errors.title]

  return (
    <section className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
      <h2 className="text-md font-semibold text-text-primary">{t.add.title}</h2>
      {candidates.length === 0 ? (
        <p className="text-sm text-text-secondary">{t.add.noCandidate}</p>
      ) : (
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const result = await addSignerAction(slug, { userId, fullName, title })
              if (!result.ok) {
                setErrors(result.errors)
                return
              }
              setErrors({})
              setTitle('')
              router.refresh()
            })
          }}
        >
          <FormField id="signer-member" label={t.add.member}>
            <select
              {...fieldIds('signer-member')}
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                setFullName(candidates.find((c) => c.userId === e.target.value)?.name ?? '')
              }}
              className={selectClass}
            >
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="signer-name" label={t.add.fullName} error={nameError}>
            <Input
              {...fieldIds('signer-name', undefined, nameError)}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </FormField>
          <FormField id="signer-title" label={t.add.jobTitle} error={titleError}>
            <Input
              {...fieldIds('signer-title', undefined, titleError)}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={pending}>
              {t.add.save}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

/** "Smije potpisivati u ovoj firmi": only the owner turns it on (04 memberships.can_sign). */
export function BookkeeperSwitches({
  slug,
  bookkeepers,
  canChange,
}: {
  slug: string
  bookkeepers: SignersDTO['bookkeepers']
  canChange: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <section className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
      <h2 className="text-md font-semibold text-text-primary">{t.bookkeeper.title}</h2>
      <ul className="grid gap-2">
        {bookkeepers.map((b) => (
          <li key={b.membershipId} className="flex flex-wrap items-center gap-3 text-sm">
            <span id={`bk-${b.membershipId}`} className="min-w-40 font-semibold">
              {b.name}
            </span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={b.canSign}
                disabled={!canChange || pending}
                aria-describedby={`bk-${b.membershipId}`}
                onChange={(e) =>
                  start(async () => {
                    await setBookkeeperCanSignAction(slug, b.membershipId, e.target.checked)
                    router.refresh()
                  })
                }
                className="size-4 accent-brand"
              />
              {t.bookkeeper.label}
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-secondary">{t.bookkeeper.hint}</p>
    </section>
  )
}
