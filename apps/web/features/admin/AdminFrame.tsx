import { copy } from '@wc/copy'
import { cn } from 'cn'
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { type ScreenState, screenState } from '@/lib/screen-state'
import { GuardError, requireSuperAdmin } from '@/lib/session'

const n = copy.admin.nav
const SECTIONS = [
  ['overview', '/admin'],
  ['tenants', '/admin/tenants'],
  ['jobs', '/admin/jobs'],
  ['wageSchedules', '/admin/wage-schedules'],
  ['classifications', '/admin/classifications'],
] as const
export type AdminSection = (typeof SECTIONS)[number][0]

/**
 * The admin's own frame (spec/03 §4.10): not a company's shell, because the
 * platform admin is no member of any (02 §1). Anyone else gets the forbidden
 * state; loading and error come from ?state= like every screen (19 §7).
 */
export async function adminPage(
  section: AdminSection,
  search: { state?: string },
): Promise<
  | { done: ReactNode }
  | { userId: string; forced: ScreenState | undefined; frame: (body: ReactNode) => ReactNode }
> {
  const forced = screenState(search.state)
  let userId: string | null = null
  try {
    userId = (await requireSuperAdmin()).user.id
  } catch (error) {
    if (!(error instanceof GuardError)) throw error
  }
  const frame = (body: ReactNode) => (
    <div className="min-h-dvh bg-surface-page">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border-decorative bg-n-900 px-6 py-3">
        <span className="text-sm font-semibold text-white">{copy.admin.name}</span>
        {userId && (
          <nav aria-label={copy.admin.name} className="flex flex-wrap gap-1">
            {SECTIONS.map(([key, href]) => (
              <Link
                key={key}
                href={href}
                aria-current={key === section ? 'page' : undefined}
                className={cn(
                  'rounded-md px-2.5 py-1 text-sm text-n-300 hover:bg-white/10 hover:text-white focus-visible:focus-ring',
                  key === section && 'bg-white/10 font-semibold text-white',
                )}
              >
                {n[key]}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto grid w-full max-w-[1200px] gap-4 p-6">
        <h1 className="text-lg font-semibold text-text-primary">{n[section]}</h1>
        {body}
      </main>
    </div>
  )
  if (!userId || forced === 'forbidden') {
    return {
      done: frame(
        <EmptyState icon={ShieldAlert} title={copy.forbidden.title} body={copy.admin.forbidden} />,
      ),
    }
  }
  if (forced === 'loading') return { done: frame(<LoadingTable columns={4} rows={5} />) }
  if (forced === 'error') return { done: frame(<RetryErrorState />) }
  return { userId, forced, frame }
}
