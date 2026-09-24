// Workers and fringe plans over the fixtures (spec/03 §4.6, session G).
// What is tested is the line around PII: which DTO carries what, the SSN field
// that takes four digits and nothing else, SSN4 or DOB and never both, and a
// log row for every Show (spec/02 §3 and §4, spec/04 §6, spec/11 §5).
import { beforeEach, describe, expect, it } from 'vitest'
import {
  FringePlanInputSchema,
  WorkerInputSchema,
  WorkerNameDTOSchema,
  WorkerRowDTOSchema,
  workerFormErrors,
} from '../src/dto/index.ts'
import { getRepositories } from '../src/index.ts'
import { db, resetMockDb } from '../src/mock/db.ts'

const repos = getRepositories()
const TENANT = '01921000-0000-7000-8000-000000000001'
const OWNER = '01922000-0000-7000-8000-000000000001'
const ALVAREZ = '01927000-0000-7000-8000-000000000001'
const ORTEGA = '01927000-0000-7000-8000-000000000009'
const OKAFOR = '01927000-0000-7000-8000-000000000004'
const HADDAD = '01927000-0000-7000-8000-00000000000c'

beforeEach(resetMockDb)

async function form(workerId: string | null) {
  const dto = await repos.workers.form(TENANT, workerId)
  if (!dto) throw new Error('fixture')
  return dto
}

/** Every value the fixtures hold as PII, so a test can look for any of them in a DTO. */
function piiValues(): string[] {
  return db.workerPii.flatMap((p) => [
    ...(p.ssnLast4 ? [p.ssnLast4] : []),
    ...(p.dateOfBirth ? [p.dateOfBirth] : []),
    ...(p.address ? [p.address.address1] : []),
  ])
}

describe('the list (spec/03 §4.6)', () => {
  it('has twelve workers in the shape of the DTO, and no address or SSN in it', async () => {
    const rows = await repos.workers.list(TENANT)
    expect(rows).toHaveLength(12)
    expect(rows.every((r) => WorkerRowDTOSchema.strict().safeParse(r).success)).toBe(true)
    const text = JSON.stringify(rows)
    for (const value of piiValues()) expect(text).not.toContain(value)
  })

  it('knows the projects and the last week with hours', async () => {
    const alvarez = (await repos.workers.list(TENANT)).find((r) => r.id === ALVAREZ)
    expect(alvarez?.projects.map((p) => p.name)).toEqual(['Dutchess County Courthouse Lighting'])
    expect(alvarez?.lastWeekWithHours).toBe('2026-09-12')
  })

  it('searches by name and by worker number, and filters by status', async () => {
    expect((await repos.workers.list(TENANT, { query: 'okaf' })).map((r) => r.id)).toEqual([OKAFOR])
    expect((await repos.workers.list(TENANT, { query: '1050' })).map((r) => r.id)).toEqual([ORTEGA])
    expect(await repos.workers.list(TENANT, { status: 'inactive' })).toEqual([])
  })

  it('gives the viewer the name and the classification, and not one field more (spec/02 §3)', async () => {
    const names = await repos.workers.names(TENANT)
    expect(names).toHaveLength(12)
    expect(names.every((n) => WorkerNameDTOSchema.strict().safeParse(n).success)).toBe(true)
    expect(Object.keys(names[0] ?? {}).sort()).toEqual([
      'defaultClassification',
      'displayName',
      'id',
      'status',
    ])
  })
})

describe('the form holds no PII until Show (spec/04 §6)', () => {
  it('says which parts are on file, never their values', async () => {
    const dto = await form(ALVAREZ)
    expect(dto.pii).toEqual({
      hasSsnLast4: true,
      hasDateOfBirth: false,
      place: { city: 'Poughkeepsie', state: 'NY', postalCode: expect.any(String) },
    })
    expect(dto.values.ssnLast4).toBeUndefined()
    expect(dto.values.address).toBeUndefined()
    const text = JSON.stringify(dto)
    for (const value of piiValues()) expect(text).not.toContain(value)
  })

  it('carries the apprenticeship, the fringe credit per plan and the weeks worked', async () => {
    const dto = await form(OKAFOR)
    expect(dto.values.apprentice?.pctOfJourney).toBe('55.00')
    expect(dto.fringe.length).toBeGreaterThan(0)
    expect(dto.history[0]?.weekEnding).toBe('2026-09-12')
    // The corrected Aug 8 week and its correction are one week in the history.
    const weeks = dto.history.map((h) => h.weekEnding)
    expect(new Set(weeks).size).toBe(weeks.length)
  })

  it('Show hands out one part and writes pii_access_log, without the value', async () => {
    expect(db.piiAccessLog).toHaveLength(0)
    expect(await repos.workers.readPii(TENANT, ALVAREZ, OWNER, 'ssnLast4')).toEqual({
      part: 'ssnLast4',
      value: '4417',
    })
    const address = await repos.workers.readPii(TENANT, ALVAREZ, OWNER, 'address')
    expect(address?.part).toBe('address')
    expect(db.piiAccessLog).toEqual([
      expect.objectContaining({ workerId: ALVAREZ, userId: OWNER, fields: ['ssnLast4'] }),
      expect.objectContaining({ workerId: ALVAREZ, userId: OWNER, fields: ['address', 'phone'] }),
    ])
    expect(JSON.stringify(db.piiAccessLog)).not.toContain('4417')
  })

  it('logs nothing when there is nothing to show', async () => {
    expect(await repos.workers.readPii(TENANT, HADDAD, OWNER, 'address')).toBeNull()
    expect(db.piiAccessLog).toHaveLength(0)
  })
})

describe('the SSN field takes exactly four digits (spec/03 §4.6, spec/11 §5)', () => {
  const base = async () => ({ ...(await form(null)).values, firstName: 'Ana', lastName: 'Lee' })

  it.each([['12345'], ['123'], ['12a4']])('the server refuses %s', async (ssn) => {
    const parsed = WorkerInputSchema.safeParse({ ...(await base()), ssnLast4: ssn })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(workerFormErrors(parsed.error).ssnLast4?.code).toBe('ssnFormat')
  })

  it('takes four digits', async () => {
    const parsed = WorkerInputSchema.safeParse({ ...(await base()), ssnLast4: '1234' })
    expect(parsed.success).toBe(true)
  })
})

describe('SSN4 or date of birth, one of the two (spec/04 worker_pii)', () => {
  const input = async (extra: object) =>
    WorkerInputSchema.parse({
      ...(await form(null)).values,
      firstName: 'Ana',
      lastName: 'Lee',
      ...extra,
    })

  it('a new worker needs one, in the form and on the server', async () => {
    const empty = { ...(await form(null)).values, firstName: 'Ana', lastName: 'Lee' }
    const parsed = WorkerInputSchema.safeParse({ ...empty, ssnLast4: '', dateOfBirth: '' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(workerFormErrors(parsed.error).ssnLast4?.code).toBe('idRequired')
    // Neither part sent at all: the server still finds nothing on file.
    const result = await repos.workers.create(TENANT, await input({}))
    expect(result).toEqual({ ok: false, errors: { ssnLast4: { code: 'idRequired' } } })
  })

  it('not both, in the form', async () => {
    const parsed = WorkerInputSchema.safeParse({
      ...(await form(null)).values,
      firstName: 'Ana',
      lastName: 'Lee',
      ssnLast4: '1234',
      dateOfBirth: '1990-01-01',
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(workerFormErrors(parsed.error).ssnLast4?.code).toBe('idBoth')
  })

  it('not both, against what is on file when the SSN stayed hidden', async () => {
    const values = (await form(ALVAREZ)).values
    const result = await repos.workers.update(TENANT, ALVAREZ, {
      ...values,
      dateOfBirth: '1990-01-01',
    })
    expect(result).toEqual({ ok: false, errors: { ssnLast4: { code: 'idBoth' } } })
  })

  it('switching from SSN4 to a date of birth works when the SSN is cleared', async () => {
    const values = (await form(ALVAREZ)).values
    const result = await repos.workers.update(TENANT, ALVAREZ, {
      ...values,
      ssnLast4: '',
      dateOfBirth: '1990-01-01',
    })
    expect(result.ok).toBe(true)
    expect((await form(ALVAREZ)).pii).toMatchObject({ hasSsnLast4: false, hasDateOfBirth: true })
  })
})

describe('saving a worker', () => {
  it('creates one with an address, and the address is only readable through Show', async () => {
    const values = WorkerInputSchema.parse({
      ...(await form(null)).values,
      firstName: 'Ana',
      lastName: 'Lee',
      workerNumber: '2001',
      ssnLast4: '0042',
      address: {
        address1: '1 Main St',
        address2: '',
        city: 'Beacon',
        state: 'NY',
        postalCode: '12508',
        postalCodeExt: '',
        phone: '',
      },
    })
    const result = await repos.workers.create(TENANT, values)
    if (!result.ok) throw new Error(JSON.stringify(result.errors))
    const created = await form(result.id)
    expect(created.pii.place).toEqual({ city: 'Beacon', state: 'NY', postalCode: '12508' })
    expect(JSON.stringify(created)).not.toContain('1 Main St')
  })

  it('refuses a worker number another worker has', async () => {
    const values = (await form(ALVAREZ)).values
    const result = await repos.workers.update(TENANT, ALVAREZ, { ...values, workerNumber: '1050' })
    expect(result).toEqual({
      ok: false,
      errors: { workerNumber: { code: 'numberTaken', values: { Worker: 'Ortega, Luis' } } },
    })
  })

  it('refuses a partial address and an address line over 42 characters', () => {
    const address = {
      address1: 'x'.repeat(43),
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      postalCodeExt: '',
      phone: '',
    }
    const parsed = WorkerInputSchema.safeParse({
      firstName: 'A',
      middleName: '',
      lastName: 'B',
      workerNumber: '',
      defaultClassificationId: '',
      level: 'J',
      hireDate: '',
      status: 'active',
      address,
      apprentice: null,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(workerFormErrors(parsed.error)['address.address1']?.code).toBe('address1Length')
    }
  })
})

describe('fringe plans (spec/03 §4.6)', () => {
  it('lists five plans, with the workers on each and the company hours basis', async () => {
    const dto = await repos.fringe.list(TENANT)
    expect(dto.plans).toHaveLength(5)
    expect(dto.annualHoursBasis).toBe('2080')
    expect(dto.plans.reduce((n, p) => n + p.workerCount, 0)).toBeGreaterThan(0)
  })

  it('creates a plan from a yearly cost, and refuses one without a cost or a credit', async () => {
    const plan = {
      name: 'Local 3 Vacation Fund',
      kind: 'vacation_holiday',
      funding: 'plan_contribution',
      planNumber: '',
      provider: '',
      hourlyCredit: '',
      annualCost: '7200.00',
      annualHoursBasis: '',
      annualize: true,
      isLegallyRequired: false,
    } as const
    expect(FringePlanInputSchema.safeParse({ ...plan, annualCost: '' }).success).toBe(false)
    const result = await repos.fringe.create(TENANT, FringePlanInputSchema.parse(plan))
    expect(result.ok).toBe(true)
    expect((await repos.fringe.list(TENANT)).plans).toHaveLength(6)
  })
})
