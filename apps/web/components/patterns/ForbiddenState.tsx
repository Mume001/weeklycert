import { copy, fill } from '@wc/copy'
import type { MembershipRole } from '@wc/data/dto'
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export interface ForbiddenStateProps {
  /** The role the user has here. */
  role: MembershipRole
  /** The role this page needs. */
  needed: MembershipRole
  /** Who to ask ("Ask {Owner name} for access", spec/15 §3). */
  owner: { name: string; email: string }
  dashboardHref: string
}

/** spec/19 §7: says which role is needed and leaks no data. */
export function ForbiddenState({ role, needed, owner, dashboardHref }: ForbiddenStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border-decorative bg-white px-6 py-10 text-center">
      <ShieldAlert className="size-8 text-n-600" strokeWidth={1.75} aria-hidden="true" />
      <p className="text-md font-semibold text-text-primary">{copy.forbidden.title}</p>
      <p className="max-w-prose text-sm text-text-secondary">
        {fill(copy.forbidden.body, {
          Needed: copy.roles[needed].label,
          Current: copy.roles[role].label,
        })}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <a href={`mailto:${owner.email}`}>
            {fill(copy.forbidden.askOwner, { 'Owner name': owner.name })}
          </a>
        </Button>
        <Button asChild variant="secondary">
          <Link href={dashboardHref}>{copy.forbidden.backToDashboard}</Link>
        </Button>
      </div>
    </div>
  )
}
