// The sidebar, per role (spec/02 §5 decides visibility, spec/15 §3 the words
// and order) and where "This week" goes (spec/03 §3).
// Hiding an item is not protection: every route checks access itself.
import { copy } from '@wc/copy'
import type { MembershipRole, OpenWeeksDTO } from '@wc/data/dto'

export type NavKey =
  | 'dashboard'
  | 'thisWeek'
  | 'projects'
  | 'workers'
  | 'fringePlans'
  | 'import'
  | 'archive'
  | 'setup'
  | 'settings'
  | 'help'

export type NavGroup = 'main' | 'company' | 'footer'

export interface NavItem {
  key: NavKey
  label: string
  href: string
  group: NavGroup
  /** "This week" counter. Absent when zero (spec/03 §3). */
  badge?: number
}

const ALL: readonly MembershipRole[] = [
  'owner',
  'admin',
  'payroll',
  'signer',
  'viewer',
  'bookkeeper',
]
const NOT_VIEWER: readonly MembershipRole[] = ['owner', 'admin', 'payroll', 'signer', 'bookkeeper']

/** spec/02 §5, row by row. nav.test.ts compares this with the table in the spec. */
export const NAV_MATRIX: Record<NavKey, readonly MembershipRole[]> = {
  dashboard: ALL,
  thisWeek: ALL,
  projects: ALL,
  workers: ALL,
  fringePlans: ALL,
  import: NOT_VIEWER,
  archive: ALL,
  setup: NOT_VIEWER,
  settings: NOT_VIEWER,
  help: ALL,
}

/** Order from spec/15 §3; the last three sit under the "Company" heading, help at the bottom. */
const ORDER: readonly [NavKey, NavGroup][] = [
  ['dashboard', 'main'],
  ['thisWeek', 'main'],
  ['projects', 'main'],
  ['workers', 'main'],
  ['fringePlans', 'main'],
  ['import', 'main'],
  ['archive', 'main'],
  ['setup', 'company'],
  ['settings', 'company'],
  ['help', 'footer'],
]

/** Help is always in the same place (WCAG 3.2.6). Support is email only (spec/15 §3). */
export const HELP_HREF = 'mailto:support@weeklycert.com'

export interface ThisWeekTarget {
  href: string
  /** Open weeks on all active projects. */
  count: number
}

/**
 * spec/03 §3, "Kuda vodi This week". Never picks a project for the user when
 * there are two or more: that is how hours end up in the wrong week.
 */
export function thisWeekTarget(
  slug: string,
  open: OpenWeeksDTO,
  lastOpenedProjectId?: string,
): ThisWeekTarget {
  const base = `/app/${slug}`
  const projects = open.activeProjects
  const count = projects.reduce((sum, p) => sum + p.openWeeks.length, 0)
  const grid = (projectId: string, weekEnding: string) =>
    `${base}/projects/${projectId}/weeks/${weekEnding}`

  if (projects.length === 0) return { href: `${base}/projects`, count }
  if (count === 0) {
    const only = projects.length === 1 ? projects[0] : undefined
    const project = only ?? projects.find((p) => p.id === lastOpenedProjectId)
    // Two or more projects and no known last one: let the user choose.
    if (!project) return { href: `${base}/projects`, count }
    return { href: grid(project.id, open.currentWeekEnding), count }
  }
  if (projects.length === 1 && projects[0]?.openWeeks[0]) {
    return { href: grid(projects[0].id, projects[0].openWeeks[0]), count }
  }
  return { href: `${base}/projects?open=1`, count }
}

function hrefFor(key: NavKey, slug: string, thisWeek: ThisWeekTarget): string {
  const base = `/app/${slug}`
  switch (key) {
    case 'dashboard':
      return `${base}/dashboard`
    case 'thisWeek':
      return thisWeek.href
    case 'projects':
      return `${base}/projects`
    case 'workers':
      return `${base}/workers`
    case 'fringePlans':
      return `${base}/fringe-plans`
    case 'import':
      return `${base}/imports`
    case 'archive':
      return `${base}/archive`
    case 'setup':
      return `${base}/onboarding`
    case 'settings':
      return `${base}/settings/company`
    case 'help':
      return HELP_HREF
  }
}

export function buildNav(input: {
  role: MembershipRole
  slug: string
  openWeeks: OpenWeeksDTO
}): NavItem[] {
  const thisWeek = thisWeekTarget(input.slug, input.openWeeks)
  return ORDER.filter(([key]) => NAV_MATRIX[key].includes(input.role)).map(([key, group]) => ({
    key,
    group,
    label: copy.nav[key],
    href: hrefFor(key, input.slug, thisWeek),
    ...(key === 'thisWeek' && thisWeek.count > 0 ? { badge: thisWeek.count } : {}),
  }))
}

/** Which item is highlighted for the current URL. */
export function activeNavKey(pathname: string, search: string): NavKey | null {
  const path = pathname.replace(/^\/app\/[^/]+/, '')
  const params = new URLSearchParams(search)
  if (/^\/projects\/[^/]+\/weeks\//.test(path)) return 'thisWeek'
  if (path === '/projects' && params.get('open') === '1') return 'thisWeek'
  const prefixes: [string, NavKey][] = [
    ['/dashboard', 'dashboard'],
    ['/projects', 'projects'],
    ['/workers', 'workers'],
    ['/fringe-plans', 'fringePlans'],
    ['/imports', 'import'],
    ['/archive', 'archive'],
    ['/onboarding', 'setup'],
    ['/settings', 'settings'],
  ]
  return prefixes.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] ?? null
}
