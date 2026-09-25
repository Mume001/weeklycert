// One company never reaches another company's rows through an id (spec/19 §3,
// Repository): every method that takes an id takes the tenant too, and the
// tenant is part of the lookup, not only of the guard. Another company's id
// gets the same as an id that does not exist. RLS enforces this in step 4.
//
// Two checks, so a new method cannot slip past:
// 1. The interface itself: any parameter named `...Id` needs `tenantId` first.
// 2. Every such method has a probe below that asks for company A's row as
//    company B and gets nothing back. A method without a probe fails here.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRepositories, type Repositories } from '../src/index.ts'
import { db, resetMockDb } from '../src/mock/db.ts'
import { mockRepositories } from '../src/mock/index.ts'
import { resetWeekEdits, weekGrid } from '../src/mock/week-grid.ts'

const repos = getRepositories()
const A = '01921000-0000-7000-8000-000000000001'
const B = '01921000-0000-7000-8000-000000000002'
// Company A's rows.
const PROJECT = '01924000-0000-7000-8000-000000000001'
const RATE = '01926000-0000-7000-8000-000000000001'
const WORKER = '01927000-0000-7000-8000-000000000001'
const PLAN = '01929000-0000-7000-8000-000000000001'
const ALLOCATION = '0192a000-0000-7000-8000-000000000001'
const OPEN_WEEK = '2026-09-12'
const OPEN_PERIOD = '01928000-0000-7000-8000-000000000018'
const REPORT = '0192c000-0000-7000-8000-000000000001'
const SUBMISSION = '0192d000-0000-7000-8000-000000000001'
/** A member of company A only. */
const USER_OF_A = '01922000-0000-7000-8000-000000000004'
const IMPORT_BATCH = '01930000-0000-7000-8000-000000000001'

/**
 * Methods that take a user id and no company: the user is the signed-in
 * session's own, not a row a company owns. Nothing else goes on this list.
 */
const USER_SCOPED = new Set(['users.get', 'tenants.listForUser'])

const rates = { baseRate: '50.00', supplement: '30.00', otCodes: '', effectiveFrom: '2026-10-03' }

/** Company B asking for company A's rows, one probe per method that takes an id. */
const PROBES: Record<string, (r: Repositories) => Promise<unknown>> = {
  'projects.timeline': (r) => r.projects.timeline(B, PROJECT),
  'projects.form': (r) => r.projects.form(B, PROJECT),
  'projects.update': async (r) => {
    const form = await r.projects.form(A, PROJECT)
    if (!form) throw new Error('fixture')
    return r.projects.update(B, PROJECT, { ...form.values, name: 'Taken over' })
  },
  'projects.classifications': (r) => r.projects.classifications(B, PROJECT),
  'projects.addClassification': (r) =>
    r.projects.addClassification(B, PROJECT, {
      ...rates,
      classificationId: 'x',
      displayLabel: '',
      apprenticeRatio: '',
    }),
  'projects.addRateVersion': (r) =>
    r.projects.addRateVersion(B, PROJECT, { ...rates, rowId: RATE }),
  'projects.editClassification': (r) =>
    r.projects.editClassification(B, PROJECT, {
      ...rates,
      rowId: RATE,
      displayLabel: 'Taken over',
      apprenticeRatio: '',
    }),
  'weeks.grid': (r) => r.weeks.grid(B, PROJECT, OPEN_WEEK),
  'weeks.engineInput': (r) => r.weeks.engineInput(B, PROJECT, OPEN_WEEK),
  'weeks.patchCell': async (r) => {
    const row = weekGrid(PROJECT, OPEN_WEEK).rows[0]
    if (!row) throw new Error('fixture')
    return r.weeks.patchCell(B, OPEN_PERIOD, row.id, 1, '12')
  },
  'weeks.findings': (r) => r.weeks.findings(B, OPEN_PERIOD),
  'weeks.copyPreviousWeek': (r) => r.weeks.copyPreviousWeek(B, OPEN_PERIOD),
  'weeks.open': (r) => r.weeks.open(B, PROJECT, OPEN_WEEK),
  'weeks.markNoWork': (r) => r.weeks.markNoWork(B, OPEN_PERIOD),
  'weeks.review': (r) => r.weeks.review(B, PROJECT, OPEN_WEEK),
  'weeks.savePayroll': (r) =>
    r.weeks.savePayroll(B, OPEN_PERIOD, {
      workerId: WORKER,
      grossAllWork: '1.00',
      netPay: '1.00',
      deductions: [],
    }),
  'reports.list': (r) => r.reports.list(B, PROJECT, OPEN_WEEK),
  'reports.generate': (r) => r.reports.generate(B, OPEN_PERIOD),
  'reports.status': (r) => r.reports.status(B, REPORT),
  'reports.signer': (r) => r.reports.signer(B, USER_OF_A),
  'reports.sign': (r) =>
    r.reports.sign(B, OPEN_PERIOD, USER_OF_A, {
      fullName: 'X',
      title: 'X',
      phone: '',
      email: '',
      understood: true,
      reauth: 'x',
    }),
  'reports.recordSubmission': (r) =>
    r.reports.recordSubmission(B, OPEN_PERIOD, { channel: 'email_to_prime', confirmationRef: 'x' }),
  'reports.recordOutcome': (r) => r.reports.recordOutcome(B, SUBMISSION, 'rejected', 'x'),
  'reports.createCorrection': (r) => r.reports.createCorrection(B, OPEN_PERIOD, 'x'),
  'reports.file': (r) => r.reports.file(B, `${REPORT}:ny_xml`),
  'workers.name': (r) => r.workers.name(B, WORKER),
  'workers.form': (r) => r.workers.form(B, WORKER),
  'workers.update': async (r) => {
    const form = await r.workers.form(A, WORKER)
    if (!form) throw new Error('fixture')
    return r.workers.update(B, WORKER, { ...form.values, firstName: 'Taken over' })
  },
  'workers.readPii': (r) => r.workers.readPii(B, WORKER, USER_OF_A, 'address'),
  'workers.addAllocation': (r) =>
    r.workers.addAllocation(B, WORKER, {
      fringePlanId: PLAN,
      hourlyCreditOverride: '99.00',
      effectiveFrom: '2026-09-06',
      effectiveTo: '',
    }),
  'workers.updateAllocation': (r) =>
    r.workers.updateAllocation(B, WORKER, ALLOCATION, {
      fringePlanId: PLAN,
      hourlyCreditOverride: '99.00',
      effectiveFrom: '2026-01-01',
      effectiveTo: '',
    }),
  'fringe.update': (r) =>
    r.fringe.update(B, PLAN, {
      name: 'Taken over',
      kind: 'pension',
      funding: 'plan_contribution',
      planNumber: '',
      provider: '',
      hourlyCredit: '1.00',
      annualCost: '',
      annualHoursBasis: '',
      annualize: true,
      isLegallyRequired: false,
    }),
  'imports.preview': (r) => r.imports.preview(B, IMPORT_BATCH),
}

interface Signature {
  method: string
  params: string[]
}

/** The methods of the Repositories interface, with their parameter names, read by the compiler. */
function signatures(): Signature[] {
  const path = fileURLToPath(new URL('../src/repositories.ts', import.meta.url))
  const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest)
  const repositories = file.statements.find(
    (s): s is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(s) && s.name.text === 'Repositories',
  )
  if (!repositories) throw new Error('No Repositories interface in repositories.ts')
  const nameOf = (m: ts.TypeElement) => (m.name && ts.isIdentifier(m.name) ? m.name.text : '')
  const paramsOf = (m: ts.MethodSignature) =>
    m.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : ''))

  return repositories.members.flatMap((member): Signature[] => {
    if (ts.isMethodSignature(member)) {
      return [{ method: nameOf(member), params: paramsOf(member) }]
    }
    if (ts.isPropertySignature(member) && member.type && ts.isTypeLiteralNode(member.type)) {
      return member.type.members.filter(ts.isMethodSignature).map((m) => ({
        method: `${nameOf(member)}.${nameOf(m)}`,
        params: paramsOf(m),
      }))
    }
    return []
  })
}

/** Every method the mock actually has, as `group.method`. */
function implemented(): string[] {
  return Object.entries(mockRepositories).flatMap(([key, value]) =>
    typeof value === 'function' ? [key] : Object.keys(value).map((m) => `${key}.${m}`),
  )
}

const takesId = (s: Signature) => s.params.some((p) => /Id$/.test(p) && p !== 'tenantId')

beforeEach(() => {
  resetMockDb()
  resetWeekEdits()
})

describe('the interface (spec/19 §3, Repository)', () => {
  it('is read whole: every implemented method is found in the source', () => {
    expect(
      signatures()
        .map((s) => s.method)
        .sort(),
    ).toEqual(implemented().sort())
  })

  it('takes tenantId first in every method that takes an id', () => {
    const missing = signatures()
      .filter((s) => takesId(s) && !USER_SCOPED.has(s.method) && s.params[0] !== 'tenantId')
      .map((s) => s.method)
    expect(missing).toEqual([])
  })

  it('has a cross-company probe below for every method that takes an id', () => {
    const needProbe = signatures()
      .filter((s) => takesId(s) && !USER_SCOPED.has(s.method))
      .map((s) => s.method)
      .sort()
    expect(Object.keys(PROBES).sort()).toEqual(needProbe)
  })
})

describe("company B asking for company A's rows", () => {
  it.each(Object.keys(PROBES))('%s gets nothing', async (method) => {
    const probe = PROBES[method]
    if (!probe) throw new Error(method)
    const before = JSON.stringify(db)
    const gridBefore = JSON.stringify(weekGrid(PROJECT, OPEN_WEEK))

    const answer = await probe(repos).then(
      (value) => ({ value }),
      () => ({ value: null }),
    )

    // Refused, or found nothing: the same as for an id that does not exist.
    expect(answer.value ?? null).toBeNull()
    // And nothing of company A's changed on the way.
    expect(JSON.stringify(db)).toBe(before)
    expect(JSON.stringify(weekGrid(PROJECT, OPEN_WEEK))).toBe(gridBefore)
  })
})
