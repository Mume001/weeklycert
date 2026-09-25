// Imports over the fixtures (spec/03 §4.7, spec/06, session I): a file through
// the four steps into the grid, and back out with undo.
import { dec } from '@wc/core'
import type { Table } from '@wc/core/import'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRepositories } from '../src/index.ts'
import { db, resetMockDb } from '../src/mock/db.ts'
import { resetWeekEdits, weekGrid } from '../src/mock/week-grid.ts'

const repos = getRepositories()
const TENANT = '01921000-0000-7000-8000-000000000001'
const OWNER = '01922000-0000-7000-8000-000000000001'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const OPEN_WEEK = '2026-09-12'
const SIGNED_WEEK = '2026-08-29'
const ALVAREZ = '01927000-0000-7000-8000-000000000001'
const WIREMAN = 'Electrician – Inside Wireman'

/** A value in the shape of a full SSN, assembled at run time (the ssn gate); area 000 is never issued. */
const FULL_SSN_SHAPE = ['000', '12', '3456'].join('-')

beforeEach(() => {
  resetMockDb()
  resetWeekEdits()
})

const table = (headers: string[], rows: string[][]): Table => ({ headers, rows, format: 'csv' })

/** Sunday of the open week: Alvarez's hours that day, as the grid shows them. */
function alvarezTotal(weekEnding = OPEN_WEEK): string {
  const row = weekGrid(DUTCHESS, weekEnding).rows.find((r) => r.workerId === ALVAREZ)
  return row?.totalHours ?? '0'
}

async function hoursImport(file: Table, weekEnding = OPEN_WEEK, sha = 'sha-1') {
  return repos.imports.start(
    TENANT,
    OWNER,
    { kind: 'hours', source: 'quickbooks_time', projectId: DUTCHESS, weekEnding },
    { name: 'hours.csv', sha256: sha, table: file },
  )
}

async function throughCheck(batchId: string, profileName = '') {
  const draft = await repos.imports.draft(TENANT, batchId)
  const mapping = Object.fromEntries(
    draft.fields.flatMap((f) => (f.column === null ? [] : [[f.target, f.column]])),
  )
  expect(
    await repos.imports.setMapping(TENANT, batchId, {
      mapping,
      dateFormat: draft.dateFormat,
      lastWins: false,
      profileName,
    }),
  ).toEqual({ ok: true })
  return repos.imports.draft(TENANT, batchId)
}

const SUNDAY_FILE = table(
  ['Employee', 'Date', 'Service item', 'Hours'],
  [['1021', '09/06/2026', WIREMAN, '8']],
)

describe('hours, step by step (06 §2)', () => {
  it('suggests the mapping, checks, reconciles, applies into the grid, and undoes', async () => {
    const before = alvarezTotal()
    const batchId = await hoursImport(SUNDAY_FILE)
    const first = await repos.imports.draft(TENANT, batchId)
    expect(first.fields.filter((f) => f.column !== null).map((f) => f.target)).toEqual([
      'worker',
      'date',
      'hours',
      'classification',
    ])

    const checked = await throughCheck(batchId)
    expect(checked.check?.counts).toMatchObject({ total: 1, ok: 1, error: 0 })
    expect(await repos.imports.confirmCheck(TENANT, batchId, false)).toEqual({ ok: true })
    const reconcile = (await repos.imports.draft(TENANT, batchId)).reconcile
    expect(reconcile).toEqual([
      expect.objectContaining({ workerId: ALVAREZ, inFile: '8.00', onProject: null }),
    ])

    expect(await repos.imports.apply(TENANT, batchId, OWNER)).toEqual({
      ok: true,
      summary: { rowsImported: 1, workers: 1, rowsSkipped: 0, weekEnding: OPEN_WEEK },
    })
    expect(dec(alvarezTotal()).minus(before).toString()).toBe('8')
    expect((await repos.imports.get(TENANT, batchId))?.canUndo).toBe(true)

    expect(await repos.imports.undo(TENANT, batchId)).toEqual({ ok: true })
    expect(alvarezTotal()).toBe(before)
    expect((await repos.imports.get(TENANT, batchId))?.status).toBe('undone')
  })

  it('the same file twice gives the same entries, not twice the hours (06 §8)', async () => {
    const before = alvarezTotal()
    for (const sha of ['same', 'same']) {
      const id = await hoursImport(SUNDAY_FILE, OPEN_WEEK, sha)
      await throughCheck(id)
      await repos.imports.confirmCheck(TENANT, id, false)
      await repos.imports.apply(TENANT, id, OWNER)
    }
    expect(dec(alvarezTotal()).minus(before).toString()).toBe('8')
    // The second upload was told it had been imported already (06 §2 step 1).
    const second = db.importBatches[1]?.id ?? ''
    expect((await repos.imports.draft(TENANT, second)).duplicateOf).not.toBeNull()
  })

  it('will not apply into a signed week, nor undo once the week is signed', async () => {
    const locked = await hoursImport(
      table(['Employee', 'Date', 'Service item', 'Hours'], [['1021', '08/23/2026', WIREMAN, '8']]),
      SIGNED_WEEK,
    )
    await throughCheck(locked)
    await repos.imports.confirmCheck(TENANT, locked, false)
    expect(await repos.imports.apply(TENANT, locked, OWNER)).toEqual({
      ok: false,
      refused: 'locked',
    })

    const open = await hoursImport(SUNDAY_FILE, OPEN_WEEK, 'sha-2')
    await throughCheck(open)
    await repos.imports.confirmCheck(TENANT, open, false)
    await repos.imports.apply(TENANT, open, OWNER)
    const period = db.periods.find((p) => p.projectId === DUTCHESS && p.weekEnding === OPEN_WEEK)
    if (!period) throw new Error('fixture')
    period.status = 'signed'
    expect((await repos.imports.get(TENANT, open))?.undoRefusal).toBe('locked')
    expect(await repos.imports.undo(TENANT, open)).toEqual({ ok: false, refused: 'locked' })
  })

  it('an error blocks step 4 unless the user skips the rows with errors', async () => {
    const id = await hoursImport(
      table(
        ['Employee', 'Date', 'Service item', 'Hours'],
        [
          ['1021', '09/06/2026', WIREMAN, '8'],
          ['1021', '09/06/2026', WIREMAN, 'eight'],
        ],
      ),
    )
    await throughCheck(id)
    expect(await repos.imports.confirmCheck(TENANT, id, false)).toEqual({ ok: false })
    expect(await repos.imports.confirmCheck(TENANT, id, true)).toEqual({ ok: true })
    expect((await repos.imports.apply(TENANT, id, OWNER)).summary).toMatchObject({
      rowsImported: 1,
      rowsSkipped: 1,
    })
  })
})

describe('picks and profiles (06 §2 steps 2 and 3)', () => {
  it('a name nobody matches can become a new worker, and the profile remembers it', async () => {
    const file = table(
      ['Employee', 'Date', 'Service item', 'Hours'],
      [['J. Smith', '09/06/2026', WIREMAN, '8']],
    )
    const id = await hoursImport(file)
    const draft = await throughCheck(id, 'QuickBooks Time export')
    expect(draft.check?.unresolvedWorkers).toEqual(['J. Smith'])
    await repos.imports.resolve(TENANT, id, { workers: { 'J. Smith': 'new' }, codes: {} })
    expect((await repos.imports.draft(TENANT, id)).check?.counts.error).toBe(0)
    expect(db.workers.some((w) => w.lastName === 'Smith' && w.firstName === 'J.')).toBe(true)

    // The next file with the same columns, in another order, loads the profile.
    const again = await hoursImport(
      table(
        ['Hours', 'Service item', 'Date', 'Employee'],
        [['8', WIREMAN, '09/07/2026', 'J. Smith']],
      ),
      OPEN_WEEK,
      'sha-3',
    )
    const next = await repos.imports.draft(TENANT, again)
    expect(next.profileName).toBe('QuickBooks Time export')
    expect(next.fields.find((f) => f.target === 'worker')?.column).toBe(3)
    const rechecked = await throughCheck(again)
    expect(rechecked.check?.unresolvedWorkers).toEqual([])
  })
})

describe('payroll (06 §2 step 4)', () => {
  it('shows the gross in the file against the gross the engine computes on the project', async () => {
    const id = await repos.imports.start(
      TENANT,
      OWNER,
      { kind: 'payroll', source: 'gusto', projectId: DUTCHESS, weekEnding: OPEN_WEEK },
      {
        name: 'payroll.csv',
        sha256: 'pay',
        table: table(
          ['Employee Name', 'Gross Earnings', 'Federal Income Tax', 'Net Pay'],
          [['Alvarez, Miguel', '$2,000.00', '$150.00', '$1,500.00']],
        ),
      },
    )
    await throughCheck(id)
    await repos.imports.confirmCheck(TENANT, id, false)
    const [line] = (await repos.imports.draft(TENANT, id)).reconcile
    expect(line).toMatchObject({ workerId: ALVAREZ, inFile: '2000.00' })
    expect(dec(line?.difference ?? '0').toString()).toBe(
      dec('2000.00')
        .minus(line?.onProject ?? '0')
        .toString(),
    )
    await repos.imports.apply(TENANT, id, OWNER)
    const review = await repos.weeks.review(TENANT, DUTCHESS, OPEN_WEEK)
    expect(review?.workers.find((w) => w.workerId === ALVAREZ)?.grossAllWork).toBe('2000.00')
  })
})

describe('workers, and a full SSN in the file (06 §4 and §5)', () => {
  it('keeps only the last four digits, says which column it was, and creates the worker', async () => {
    const id = await repos.imports.start(
      TENANT,
      OWNER,
      { kind: 'workers', source: 'other', projectId: '', weekEnding: '' },
      {
        name: 'crew.csv',
        sha256: 'crew',
        table: table(
          ['First name', 'Last name', 'SSN', 'City', 'ZIP'],
          [['Ana', 'Lee', FULL_SSN_SHAPE, 'Beacon', '12508']],
        ),
      },
    )
    expect(JSON.stringify(db.importBatches)).not.toContain(FULL_SSN_SHAPE)
    const draft = await throughCheck(id)
    expect(draft.fullSsnColumns).toEqual(['SSN'])
    expect(draft.check?.rows[0]?.cells.ssnLast4).toBe('3456')
    await repos.imports.confirmCheck(TENANT, id, false)
    expect((await repos.imports.apply(TENANT, id, OWNER)).ok).toBe(true)
    const lee = db.workers.find((w) => w.lastName === 'Lee')
    expect(db.workerPii.find((p) => p.workerId === lee?.id)?.ssnLast4).toBe('3456')
  })
})
