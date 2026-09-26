import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copy } from '@wc/copy'
import type { MembershipRole, OpenWeeksDTO } from '@wc/data/dto'
import { describe, expect, it } from 'vitest'
import { activeNavKey, buildNav, NAV_MATRIX, type NavKey, thisWeekTarget } from './nav'

// A plain path, not new URL(): under jsdom the global URL is jsdom's.
const here = dirname(fileURLToPath(import.meta.url))
const spec02 = readFileSync(resolve(here, '../../../spec/02-ULOGE-I-DOZVOLE.md'), 'utf8')

/** Parses the table in spec/02 §5: item label -> roles marked x. */
function specMatrix(): Map<string, MembershipRole[]> {
  const section = spec02.split('## 5.')[1]?.split('\n## ')[0] ?? ''
  const rows = section.split('\n').filter((l) => l.startsWith('|'))
  const header = (rows[0] ?? '')
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean)
  const roles = header.slice(1) as MembershipRole[]
  const out = new Map<string, MembershipRole[]>()
  for (const row of rows.slice(2)) {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    const label = cells[0]?.replace(/\*\*/g, '') ?? ''
    const visible = roles.filter((_, i) => (cells[i + 1] ?? '').startsWith('x'))
    if (visible.length > 0) out.set(label, visible)
  }
  return out
}

const open = (projects: [string, string[]][], currentWeekEnding = '2026-09-19'): OpenWeeksDTO => ({
  today: '2026-09-15',
  currentWeekEnding,
  activeProjects: projects.map(([id, openWeeks]) => ({ id, name: id, openWeeks })),
})

describe('NAV_MATRIX is spec/02 §5', () => {
  const matrix = specMatrix()

  it('has the same items as the spec table', () => {
    const labels = (Object.keys(NAV_MATRIX) as NavKey[]).map((k) => copy.nav[k])
    expect([...matrix.keys()].sort()).toEqual(labels.sort())
  })

  it.each(Object.entries(NAV_MATRIX) as [NavKey, readonly MembershipRole[]][])(
    '%s is visible to exactly the roles in the spec',
    (key, roles) => {
      expect([...roles].sort()).toEqual([...(matrix.get(copy.nav[key]) ?? [])].sort())
    },
  )
})

describe('buildNav', () => {
  const hudson = open([
    ['p1', ['2026-09-05', '2026-09-12']],
    ['p2', ['2026-09-12']],
  ])

  it('gives the owner every item in the spec/15 order', () => {
    const nav = buildNav({ role: 'owner', slug: 'hudson-electric', openWeeks: hudson })
    expect(nav.map((i) => i.label)).toEqual([
      'Dashboard',
      'This week',
      'Projects',
      'Workers',
      'Fringe plans',
      'Import',
      'Archive',
      'Setup',
      'Settings',
      'Help and support',
    ])
    expect(nav.filter((i) => i.group === 'company').map((i) => i.key)).toEqual([
      'setup',
      'settings',
    ])
  })

  it('hides Import, Setup and Settings from the viewer, keeps This week', () => {
    const keys = buildNav({ role: 'viewer', slug: 'x', openWeeks: hudson }).map((i) => i.key)
    expect(keys).toEqual([
      'dashboard',
      'thisWeek',
      'projects',
      'workers',
      'fringePlans',
      'archive',
      'help',
    ])
  })

  it('puts the open-week count on This week', () => {
    const item = buildNav({ role: 'payroll', slug: 'x', openWeeks: hudson }).find(
      (i) => i.key === 'thisWeek',
    )
    expect(item).toMatchObject({ badge: 3, href: '/app/x/projects?open=1' })
  })

  it('prefetches only the screens that exist, up to Import (session I)', () => {
    const nav = buildNav({ role: 'owner', slug: 'x', openWeeks: hudson })
    expect(nav.filter((i) => i.prefetch).map((i) => i.key)).toEqual([
      'thisWeek',
      'projects',
      'workers',
      'fringePlans',
      'import',
      'setup',
    ])
  })

  it('shows no counter at zero', () => {
    const item = buildNav({ role: 'owner', slug: 'x', openWeeks: open([['p1', []]]) }).find(
      (i) => i.key === 'thisWeek',
    )
    expect(item?.badge).toBeUndefined()
  })
})

describe('thisWeekTarget (spec/03 §3)', () => {
  it('no active projects: the project list', () => {
    expect(thisWeekTarget('t', open([]))).toEqual({ href: '/app/t/projects', count: 0 })
  })

  it('one active project: its OLDEST open week, not the current one', () => {
    expect(thisWeekTarget('t', open([['p1', ['2026-08-29', '2026-09-05', '2026-09-12']]]))).toEqual(
      {
        href: '/app/t/projects/p1/weeks/2026-08-29',
        count: 3,
      },
    )
  })

  it('two or more: never picks one, sends to the filtered list', () => {
    expect(
      thisWeekTarget(
        't',
        open([
          ['p1', []],
          ['p2', ['2026-09-12']],
        ]),
      ),
    ).toEqual({
      href: '/app/t/projects?open=1',
      count: 1,
    })
  })

  it('all closed: the week in progress on the only project', () => {
    expect(thisWeekTarget('t', open([['p1', []]]))).toEqual({
      href: '/app/t/projects/p1/weeks/2026-09-19',
      count: 0,
    })
  })

  it('all closed with several projects: the last opened one, if known', () => {
    const o = open([
      ['p1', []],
      ['p2', []],
    ])
    expect(thisWeekTarget('t', o, 'p2').href).toBe('/app/t/projects/p2/weeks/2026-09-19')
    expect(thisWeekTarget('t', o).href).toBe('/app/t/projects')
  })
})

describe('activeNavKey', () => {
  it.each([
    ['/app/t/dashboard', '', 'dashboard'],
    ['/app/t/projects', '', 'projects'],
    ['/app/t/projects', '?open=1', 'thisWeek'],
    ['/app/t/projects/p1', '', 'projects'],
    ['/app/t/projects/p1/weeks/2026-09-12', '', 'thisWeek'],
    ['/app/t/settings/team', '', 'settings'],
    ['/app/t/onboarding', '', 'setup'],
    ['/app/t/imports/new', '', 'import'],
  ] as const)('%s%s -> %s', (path, search, key) => {
    expect(activeNavKey(path, search)).toBe(key)
  })
})
