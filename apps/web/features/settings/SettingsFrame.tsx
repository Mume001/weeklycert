import { copy } from '@wc/copy'
import { cn } from 'cn'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { LoadingTable } from '@/components/patterns/LoadingTable'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { type ScreenState, screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, type ShellContext } from '@/lib/session'
import { SECTION_ROLES, type SettingsSection, settingsSections } from '@/lib/settings-sections'
import { readOnlyTitle } from '@/lib/subscription'

const n = copy.settings.nav

/** The list of settings pages, only those the role may open (02 §5). */
function SettingsNav({
  slug,
  sections,
  current,
}: {
  slug: string
  sections: SettingsSection[]
  current: SettingsSection
}) {
  return (
    <nav aria-label={n.label} className="lg:w-48 lg:shrink-0">
      <ul className="flex flex-wrap gap-1 lg:flex-col">
        {sections.map((s) => (
          <li key={s}>
            <Link
              href={`/app/${slug}/settings/${s}`}
              aria-current={s === current ? 'page' : undefined}
              className={cn(
                'block rounded-md px-3 py-1.5 text-sm text-n-800 hover:bg-n-100 focus-visible:focus-ring',
                s === current && 'bg-n-100 font-semibold text-text-primary',
              )}
            >
              {n[s]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export interface SettingsContext {
  shell: ShellContext
  forced: ScreenState | undefined
  /** Paused or cancelled, or ?state=locked: read and export only (08 §2.4). */
  paused: boolean
  frame: (body: ReactNode) => ReactNode
}

/**
 * The frame of every settings page (03 §4.9): the page bar, the list of pages
 * the role may open, and the loading, error and forbidden states from the URL
 * (19 §7). Returns the finished page for those, or what the page needs to
 * draw itself.
 */
export async function settingsPage(
  slug: string,
  section: SettingsSection,
  search: { state?: string },
  /** The role the forbidden state names as needed. */
  needed: 'owner' | 'admin' | 'payroll',
): Promise<{ done: ReactNode } | { ctx: SettingsContext }> {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const sections = settingsSections(shell.role)
  const frame = (body: ReactNode) => (
    <>
      <PageBar
        title={n[section]}
        breadcrumb={[
          { label: shell.tenant.legalName },
          { label: copy.nav.settings, href: `/app/${slug}/settings/company` },
        ]}
      />
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-6 lg:flex-row">
        {sections.length > 0 && <SettingsNav slug={slug} sections={sections} current={section} />}
        <div className="grid min-w-0 flex-1 content-start gap-4">{body}</div>
      </div>
    </>
  )
  const forbidden = (
    <ForbiddenState
      role={forced === 'forbidden' ? 'viewer' : shell.role}
      needed={needed}
      owner={shell.tenant.owner}
      dashboardHref={`/app/${slug}/dashboard`}
    />
  )
  if (forced === 'forbidden' || !SECTION_ROLES[section].includes(shell.role)) {
    return { done: frame(forbidden) }
  }
  if (forced === 'loading') return { done: frame(<LoadingTable columns={4} rows={5} />) }
  if (forced === 'error') return { done: frame(<RetryErrorState />) }
  const paused = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  return {
    ctx: {
      shell,
      forced,
      paused,
      frame: (body) =>
        frame(
          <>
            {paused && shell.tenant.status !== 'cancelled' && (
              <Notice tone="info" title={readOnlyTitle(shell.tenant)} />
            )}
            {body}
          </>,
        ),
    },
  }
}
