// The archive over the fixtures (spec/03 §4.8, session J).
import { zipEntries } from '@wc/core/import'
import { beforeEach, describe, expect, it } from 'vitest'
import { ArchiveRowDTOSchema } from '../src/dto/index.ts'
import { getRepositories } from '../src/index.ts'
import { db, resetMockDb } from '../src/mock/db.ts'

const repos = getRepositories()
const TENANT = '01921000-0000-7000-8000-000000000001'
const OTHER = '01921000-0000-7000-8000-000000000002'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const DUTCHESS_PRC = '2010008390'

beforeEach(resetMockDb)

/** Signed NY versions of Dutchess, counted straight from the fixtures. */
function dutchessVersions(): number {
  const periods = new Set(db.periods.filter((p) => p.projectId === DUTCHESS).map((p) => p.id))
  return db.reports.filter((r) => periods.has(r.periodId) && r.kind === 'ny_xml' && r.signedAt)
    .length
}

describe('the archive (spec/03 §4.8)', () => {
  it('holds every signed version of every project, in the shape of the DTO', async () => {
    const dto = await repos.archive.list(TENANT)
    expect(dto.rows.every((r) => ArchiveRowDTOSchema.strict().safeParse(r).success)).toBe(true)
    expect(dto.projects.map((p) => p.prcNumber).sort()).toEqual([
      '2010008390',
      '2025009911',
      '2026001122',
    ])
    expect(dto.years).toContain(2026)
    // Newest week first.
    expect((dto.rows[0]?.weekEnding ?? '') >= (dto.rows.at(-1)?.weekEnding ?? '')).toBe(true)
  })

  it('answers "everything for PRC 2010008390 in 2026" in one step', async () => {
    const dto = await repos.archive.list(TENANT, { query: DUTCHESS_PRC, year: 2026 })
    expect(dto.rows).toHaveLength(dutchessVersions())
    expect(dto.rows.every((r) => r.prcNumber === DUTCHESS_PRC)).toBe(true)
    // One project left, so it can be exported as a whole.
    expect(dto.exportProjectId).toBe(DUTCHESS)
  })

  it('shows a corrected week twice, and only its newest version when asked for the latest', async () => {
    const all = await repos.archive.list(TENANT, { projectId: DUTCHESS })
    const aug8 = all.rows.filter((r) => r.weekEnding === '2026-08-08')
    expect(aug8.map((r) => [r.version, r.status])).toEqual([
      [2, 'submitted'],
      [1, 'corrected'],
    ])
    const latest = await repos.archive.list(TENANT, { projectId: DUTCHESS, versions: 'latest' })
    expect(latest.rows.filter((r) => r.weekEnding === '2026-08-08').map((r) => r.version)).toEqual([
      2,
    ])
  })

  it('filters by status, and finds a rejected filing', async () => {
    const rejected = await repos.archive.list(TENANT, { status: 'rejected' })
    expect(rejected.rows.map((r) => r.weekEnding)).toEqual(['2026-08-15'])
  })

  it('finds the weeks a worker appears in by name', async () => {
    const dto = await repos.archive.list(TENANT, { worker: 'kowalski' })
    expect(dto.rows.length).toBeGreaterThan(0)
    const weeks = new Set(
      db.timeEntries
        .filter((e) => e.workerId === '01927000-0000-7000-8000-00000000000a')
        .map((e) => db.periods.find((p) => p.id === e.periodId)?.weekEnding),
    )
    expect(dto.rows.every((r) => weeks.has(r.weekEnding))).toBe(true)
  })

  it('shows another company nothing', async () => {
    expect((await repos.archive.list(OTHER)).rows).toEqual([])
  })
})

describe('"Export everything for this project" in the mock phase (spec/20 J)', () => {
  const texts = {
    readme: 'This is an example.',
    headers: [
      'Week ending',
      'Payroll no.',
      'Version',
      'Status',
      'Signed by',
      'Submitted',
      'Confirmation',
    ],
    statuses: {
      signed: 'Signed',
      submitted: 'Submitted',
      rejected: 'Rejected',
      corrected: 'Corrected',
    },
  }

  it('is a zip named EXAMPLE, with the note, the summary and one example per version', async () => {
    const file = await repos.archive.export(TENANT, DUTCHESS, texts)
    if (!file) throw new Error('fixture')
    expect(file.name).toBe(`EXAMPLE_weeklycert-archive-${DUTCHESS_PRC}.zip`)
    const entries = zipEntries(file.body)?.map((e) => e.name) ?? []
    expect(entries[0]).toBe('EXAMPLE_README.txt')
    expect(entries[1]).toBe(`EXAMPLE_summary-${DUTCHESS_PRC}.csv`)
    expect(entries.slice(2)).toHaveLength(dutchessVersions())
    expect(entries.every((n) => n.startsWith('EXAMPLE_'))).toBe(true)
    // Stored, not compressed: the summary reads straight out of the bytes.
    const text = new TextDecoder().decode(file.body)
    expect(text).toContain(
      'Week ending,Payroll no.,Version,Status,Signed by,Submitted,Confirmation',
    )
  })

  it('gives another company nothing', async () => {
    expect(await repos.archive.export(OTHER, DUTCHESS, texts)).toBeNull()
  })
})
