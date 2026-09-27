import { copy, count } from '@wc/copy'
import { getRepositories, InvitableRoleSchema } from '@wc/data'
import { Users } from 'lucide-react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { MEMBER_REMOVERS } from '@/lib/session'
import { settingsPage } from './SettingsFrame'
import { InviteForm, PendingInvitations, TeamTable } from './TeamForms'

const t = copy.settings.team

/**
 * /settings/team (spec/03 §4.9): the members with their role, change a role,
 * remove, invite, the invitations waiting, and what each role can do. The
 * owner and the administrator only (02 §3); the administrator removes nobody
 * and never touches the owner.
 */
export async function TeamScreen({ slug, search }: { slug: string; search: { state?: string } }) {
  const page = await settingsPage(slug, 'team', search, 'admin')
  if ('done' in page) return page.done
  const { shell, forced, paused, frame } = page.ctx
  const team = await getRepositories().settings.team(shell.tenant.id)
  const members = forced === 'empty' ? [] : team.members

  return frame(
    <>
      <p className="text-sm text-text-secondary">{count(t, 'meta', members.length)}</p>
      {members.length === 0 ? (
        <EmptyState icon={Users} title={t.title} />
      ) : (
        <TeamTable
          slug={slug}
          members={members}
          userId={shell.user.id}
          canManage={!paused}
          canRemove={!paused && MEMBER_REMOVERS.includes(shell.role)}
        />
      )}
      {!paused && <InviteForm slug={slug} />}
      <PendingInvitations slug={slug} invitations={forced === 'empty' ? [] : team.invitations} />
      <section className="grid gap-2">
        <h2 className="text-md font-semibold text-text-primary">{t.rolesTitle}</h2>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
          {(['owner', ...InvitableRoleSchema.options] as const).map((role) => (
            <div key={role} className="contents">
              <dt className="font-semibold text-text-primary">{copy.roles[role].label}</dt>
              <dd className="text-text-secondary">{copy.roles[role].description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>,
  )
}
