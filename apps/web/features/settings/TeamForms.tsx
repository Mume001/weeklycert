'use client'

// What /settings/team changes (spec/03 §4.9): a role, a member removed, an
// invitation sent or revoked. The rules are the server's (spec/02 §3); the
// controls only show what the role may do.
import { copy, fill } from '@wc/copy'
import {
  type InvitableRole,
  InvitableRoleSchema,
  type InviteErrorCode,
  type TeamDTO,
} from '@wc/data/dto'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { DateText } from '@/components/patterns/DateText'
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
import {
  changeRoleAction,
  inviteAction,
  removeMemberAction,
  revokeInvitationAction,
} from './actions'

const t = copy.settings.team
const ROLES = InvitableRoleSchema.options

function RoleSelect({
  id,
  value,
  onChange,
  disabled,
  describedBy,
}: {
  id: string
  value: InvitableRole
  onChange: (role: InvitableRole) => void
  disabled?: boolean
  describedBy?: string
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-describedby={describedBy}
      onChange={(e) => onChange(InvitableRoleSchema.parse(e.target.value))}
      className={selectClass}
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {copy.roles[role].label}
        </option>
      ))}
    </select>
  )
}

function MemberRow({
  slug,
  member,
  you,
  canManage,
  canRemove,
}: {
  slug: string
  member: TeamDTO['members'][number]
  you: boolean
  canManage: boolean
  canRemove: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [saved, setSaved] = useState(false)
  const owner = member.role === 'owner'
  const selectId = `role-${member.membershipId}`
  const nameId = `name-${member.membershipId}`

  const change = (role: InvitableRole) =>
    start(async () => {
      setSaved(false)
      await changeRoleAction(slug, member.membershipId, role)
      setSaved(true)
      router.refresh()
    })

  return (
    <TableRow data-testid="member-row">
      <TableCell className="whitespace-normal">
        <span id={nameId} className="block font-semibold text-text-primary">
          {member.name}
        </span>
        <span className="block text-xs text-text-secondary">
          {member.email}
          {you && <span className="ml-2 font-semibold">{t.you}</span>}
        </span>
      </TableCell>
      <TableCell className="min-w-[11rem]">
        {owner || !canManage ? (
          <span className="flex flex-col">
            {copy.roles[member.role].label}
            {owner && canManage && (
              <span className="text-xs text-text-secondary">{t.ownerFixed}</span>
            )}
          </span>
        ) : (
          <span className="flex flex-col gap-1">
            <label htmlFor={selectId} className="sr-only">
              {t.role}
            </label>
            <RoleSelect
              id={selectId}
              value={InvitableRoleSchema.parse(member.role)}
              onChange={change}
              disabled={pending}
              describedBy={nameId}
            />
            <span role="status" className="text-xs text-text-secondary">
              {saved ? t.roleSaved : ''}
            </span>
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canRemove && !owner && !you && (
          <>
            <Button
              variant="secondary"
              size="sm"
              aria-describedby={nameId}
              onClick={() => setConfirming(true)}
            >
              {t.remove.action}
            </Button>
            <ConfirmDialog
              open={confirming}
              onOpenChange={setConfirming}
              danger
              title={fill(t.remove.title, { Name: member.name })}
              body={t.remove.body}
              confirmLabel={t.remove.confirm}
              onConfirm={() =>
                start(async () => {
                  await removeMemberAction(slug, member.membershipId)
                  setConfirming(false)
                  router.refresh()
                })
              }
            />
          </>
        )}
      </TableCell>
    </TableRow>
  )
}

export function TeamTable({
  slug,
  members,
  userId,
  canManage,
  canRemove,
}: {
  slug: string
  members: TeamDTO['members']
  userId: string
  canManage: boolean
  canRemove: boolean
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.columns.person}</TableHead>
            <TableHead>{t.columns.role}</TableHead>
            <TableHead className="text-right">{t.columns.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <MemberRow
              key={m.membershipId}
              slug={slug}
              member={m}
              you={m.userId === userId}
              canManage={canManage}
              canRemove={canRemove}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function InviteForm({ slug }: { slug: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitableRole>('payroll')
  const [error, setError] = useState<InviteErrorCode | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const message = error ? t.invite.errors[error] : undefined

  return (
    <section className="grid gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
      <h2 className="text-md font-semibold text-text-primary">{t.invite.title}</h2>
      <p className="text-sm text-text-secondary">{t.invite.demo}</p>
      <form
        noValidate
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const result = await inviteAction(slug, { email, role })
            if (!result.ok) {
              setError(result.error)
              setSent(null)
              return
            }
            setError(null)
            setSent(email.trim().toLowerCase())
            setEmail('')
            router.refresh()
          })
        }}
      >
        <div className="min-w-[260px] flex-1">
          <FormField id="invite-email" label={t.invite.email} error={message}>
            <Input
              {...fieldIds('invite-email', undefined, message)}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
        </div>
        <div className="min-w-[180px]">
          <FormField id="invite-role" label={t.invite.role}>
            <RoleSelect id="invite-role" value={role} onChange={setRole} />
          </FormField>
        </div>
        <Button type="submit" disabled={pending}>
          {t.invite.send}
        </Button>
      </form>
      <p role="status" className="text-sm text-text-secondary">
        {sent ? fill(t.invite.sent, { email: sent }) : ''}
      </p>
    </section>
  )
}

export function PendingInvitations({
  slug,
  invitations,
}: {
  slug: string
  invitations: TeamDTO['invitations']
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <section className="grid gap-3">
      <h2 className="text-md font-semibold text-text-primary">{t.pending.title}</h2>
      {invitations.length === 0 ? (
        <p className="text-sm text-text-secondary">{t.pending.empty}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.pending.columns.email}</TableHead>
                <TableHead>{t.pending.columns.role}</TableHead>
                <TableHead>{t.pending.columns.expires}</TableHead>
                <TableHead>
                  <span className="sr-only">{t.pending.revoke}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((i) => (
                <TableRow key={i.id} data-testid="invitation-row">
                  <TableCell id={`invite-${i.id}`}>{i.email}</TableCell>
                  <TableCell>{copy.roles[i.role].label}</TableCell>
                  <TableCell>
                    <DateText value={i.expiresOn} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      aria-describedby={`invite-${i.id}`}
                      onClick={() =>
                        start(async () => {
                          await revokeInvitationAction(slug, i.id)
                          router.refresh()
                        })
                      }
                    >
                      {t.pending.revoke}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
