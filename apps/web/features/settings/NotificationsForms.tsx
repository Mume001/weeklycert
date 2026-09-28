'use client'

// /settings/notifications (spec/03 §4.9): when deadline reminders go out, the
// weekly nudge, who gets what, and text messages, which stay off until the
// written consent is on record (spec/11, TCPA).
import { copy, count, fill } from '@wc/copy'
import { type NotificationsDTO, REMINDER_DAY_CHOICES } from '@wc/data/dto'
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
import { formatDate, weekdayName } from '@/lib/format'
import { saveNotificationsAction, setSmsAction } from './actions'

const t = copy.settings.notifications
const FLAGS = ['notifyDeadline', 'notifyMissingWeek', 'notifyBilling', 'notifyNewMember'] as const
const FLAG_LABEL = {
  notifyDeadline: t.recipients.columns.deadline,
  notifyMissingWeek: t.recipients.columns.missingWeek,
  notifyBilling: t.recipients.columns.billing,
  notifyNewMember: t.recipients.columns.newMember,
} as const
/** The weekly nudge goes out at 8:00 company time (03 §4.9, the design's "Monday 8:00 ET"). */
const NUDGE_TIME = '8:00'

export function NotificationsForm({
  slug,
  dto,
  readOnly,
  onlyUserId,
}: {
  slug: string
  dto: NotificationsDTO
  readOnly: boolean
  /** A role that reads only its own row (02 §3 "R (svoja)"). */
  onlyUserId: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [days, setDays] = useState<number[]>(dto.deadlineReminderDays)
  const [day, setDay] = useState(dto.reminderDay)
  const [members, setMembers] = useState(dto.members)
  const [saved, setSaved] = useState(false)
  const shown = onlyUserId ? members.filter((m) => m.userId === onlyUserId) : members

  const toggleDay = (n: number) =>
    setDays((now) => (now.includes(n) ? now.filter((d) => d !== n) : [...now, n]))

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          setSaved(false)
          await saveNotificationsAction(slug, {
            deadlineReminderDays: days,
            reminderDay: day,
            members,
          })
          setSaved(true)
          router.refresh()
        })
      }}
    >
      <section className="grid gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm sm:grid-cols-2">
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-sm font-semibold text-n-800">{t.deadline.label}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {REMINDER_DAY_CHOICES.map((n) => (
              <label key={n} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={days.includes(n)}
                  disabled={readOnly}
                  onChange={() => toggleDay(n)}
                  className="size-4 accent-brand"
                />
                {n === 0 ? t.deadline.onTheDay : count(t.deadline, 'days', n)}
              </label>
            ))}
          </div>
          <p className="text-xs text-text-secondary">{t.deadline.hint}</p>
        </fieldset>
        <FormField
          id="nudge-day"
          label={t.weekly.label}
          hint={fill(t.weekly.hint, { time: NUDGE_TIME })}
        >
          <select
            {...fieldIds('nudge-day', fill(t.weekly.hint, { time: NUDGE_TIME }))}
            value={day}
            disabled={readOnly}
            onChange={(e) => setDay(Number(e.target.value) as typeof day)}
            className={selectClass}
          >
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {weekdayName(d)}
              </option>
            ))}
          </select>
        </FormField>
      </section>

      <section className="grid gap-3">
        <h2 className="text-md font-semibold text-text-primary">{t.recipients.title}</h2>
        <div className="overflow-x-auto rounded-lg border border-border-decorative bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.recipients.columns.person}</TableHead>
                {FLAGS.map((f) => (
                  <TableHead key={f} className="text-center">
                    {FLAG_LABEL[f]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((m) => (
                <TableRow key={m.membershipId} data-testid="recipient-row">
                  <TableCell id={`who-${m.membershipId}`} className="whitespace-normal">
                    <span className="block font-semibold text-text-primary">{m.name}</span>
                    <span className="block text-xs text-text-secondary">
                      {copy.roles[m.role].label}
                    </span>
                  </TableCell>
                  {FLAGS.map((f) => (
                    <TableCell key={f} className="text-center">
                      <input
                        type="checkbox"
                        aria-label={FLAG_LABEL[f]}
                        aria-describedby={`who-${m.membershipId}`}
                        checked={m[f]}
                        disabled={readOnly}
                        onChange={(e) =>
                          setMembers((now) =>
                            now.map((x) =>
                              x.membershipId === m.membershipId
                                ? { ...x, [f]: e.target.checked }
                                : x,
                            ),
                          )
                        }
                        className="size-4 accent-brand"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {copy.buttons.save}
          </Button>
          <span role="status" className="text-sm text-text-secondary">
            {saved ? t.saved : ''}
          </span>
        </div>
      )}
    </form>
  )
}

const US_PHONE = (digits: string) =>
  `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`

export function ChannelsForm({
  slug,
  sms,
  readOnly,
  smsEnabled,
  consentText,
}: {
  slug: string
  sms: NotificationsDTO['sms']
  readOnly: boolean
  /** The sms_reminders flag: off, the screen does not mention text messages at all. */
  smsEnabled: boolean
  /** The consent with its links filled in, the same words the server keeps. */
  consentText: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const c = t.channels
  const phoneError = errors.phone === 'phoneFormat' ? c.phoneFormat : undefined
  const consentError = errors.consent ? c.consentRequired : undefined

  return (
    <section className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
      <h2 className="text-md font-semibold text-text-primary">{c.title}</h2>
      <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-semibold">{c.email}</dt>
        <dd className="text-text-secondary">{c.emailOn}</dd>
        {smsEnabled && (
          <>
            <dt className="font-semibold">{c.sms}</dt>
            <dd className="text-text-secondary" data-testid="sms-state">
              {sms ? (
                <>
                  {fill(c.smsOn, { phone: US_PHONE(sms.phone) })}{' '}
                  {fill(c.consentRecorded, { date: formatDate(sms.consentAt) })}
                </>
              ) : (
                c.smsOff
              )}
            </dd>
          </>
        )}
      </dl>
      {smsEnabled && !readOnly && sms && (
        <div>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await setSmsAction(slug, null)
                router.refresh()
              })
            }
          >
            {c.turnOff}
          </Button>
        </div>
      )}
      {smsEnabled && !readOnly && !sms && (
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const result = await setSmsAction(slug, { phone, consent })
              if (!result.ok) {
                setErrors(result.errors)
                return
              }
              setErrors({})
              setPhone('')
              setConsent(false)
              router.refresh()
            })
          }}
        >
          <div className="max-w-xs">
            <FormField id="sms-phone" label={c.phone} error={phoneError}>
              <Input
                {...fieldIds('sms-phone', undefined, phoneError)}
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid gap-1">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                aria-invalid={consentError ? true : undefined}
                aria-describedby={consentError ? 'sms-consent-error' : undefined}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-brand"
              />
              <span>{consentText}</span>
            </label>
            {consentError && (
              <p id="sms-consent-error" className="text-xs font-semibold text-error-600">
                {consentError}
              </p>
            )}
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {c.turnOn}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
