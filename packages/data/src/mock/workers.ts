// Workers and fringe plans over the fixtures (spec/03 §4.6). The credit per
// hour is core's (planCredit, the annualisation of 29 CFR 5.25(b)); this file
// only joins the tables of spec/04 the way the screens read them. PII goes
// through ../pii.ts and nowhere else.
import { dec, hours, money, planCredit, rate, sum } from '@wc/core'
import type {
  AllocationInput,
  AllocationSaveResult,
  FringePlanDTO,
  FringePlanInput,
  FringePlansDTO,
  FringeSaveResult,
  Uuid,
  WorkerFormDTO,
  WorkerInput,
  WorkerListFilter,
  WorkerNameDTO,
  WorkerRowDTO,
  WorkerSaveResult,
} from '../dto/index.ts'
import { identifierIssue } from '../dto/worker.ts'
import { identifiersOnFile, piiState, writePii } from '../pii.ts'
import { db } from './db.ts'

type WorkerRow = (typeof db.workers)[number]

/** A new row's id: deterministic, never Math.random (spec/19 §1), apart from the fixtures' variant. */
function newId(group: string, count: number): Uuid {
  return `${group}-0000-7000-9000-${String(count + 1).padStart(12, '0')}`
}

function workerOf(tenantId: Uuid, workerId: Uuid): WorkerRow | undefined {
  // The tenant check is what RLS does in step 4: another company's worker is not found.
  return db.workers.find((w) => w.id === workerId && w.tenantId === tenantId)
}

const displayName = (w: WorkerRow) => `${w.lastName}, ${w.firstName}`

function classificationRef(id: Uuid | null) {
  const c = id ? db.classificationCatalog.find((k) => k.id === id) : undefined
  return c ? { id: c.id, name: c.officialLabel } : null
}

/** Weeks with at least one hour, per project, newest first. */
function weeksWorked(workerId: Uuid) {
  const byPeriod = new Map<Uuid, string[]>()
  for (const e of db.timeEntries.filter((x) => x.workerId === workerId)) {
    const typed = e.days.filter((d): d is string => d !== null)
    byPeriod.set(e.periodId, [...(byPeriod.get(e.periodId) ?? []), ...typed])
  }
  return [...byPeriod.entries()]
    .flatMap(([periodId, days]) => {
      const period = db.periods.find((p) => p.id === periodId)
      const project = period && db.projects.find((p) => p.id === period.projectId)
      const total = sum(days.map((d) => dec(d)))
      // A corrected week is superseded by the row that corrects it (spec/04 §7.1): one week, once.
      if (!period || period.status === 'corrected' || !project || total.isZero()) return []
      return [
        {
          weekEnding: period.weekEnding,
          projectId: project.id,
          projectName: project.name,
          hours: hours(total),
        },
      ]
    })
    .sort((a, b) => b.weekEnding.localeCompare(a.weekEnding))
}

function matches(w: WorkerRow, filter: WorkerListFilter): boolean {
  if (filter.status && w.status !== filter.status) return false
  const q = filter.query?.trim().toLowerCase()
  if (!q) return true
  return [w.firstName, w.lastName, displayName(w), w.workerNumber ?? ''].some((v) =>
    v.toLowerCase().includes(q),
  )
}

const byName = (a: WorkerRow, b: WorkerRow) => displayName(a).localeCompare(displayName(b))

export function listWorkers(tenantId: Uuid, filter: WorkerListFilter = {}): WorkerRowDTO[] {
  return db.workers
    .filter((w) => w.tenantId === tenantId && matches(w, filter))
    .sort(byName)
    .map((w) => {
      const weeks = weeksWorked(w.id)
      const projects = new Map(weeks.map((x) => [x.projectId, x.projectName]))
      return {
        id: w.id,
        displayName: displayName(w),
        workerNumber: w.workerNumber,
        level: w.level,
        status: w.status,
        defaultClassification: classificationRef(w.defaultClassificationId),
        projects: [...projects.entries()].map(([id, name]) => ({ id, name })),
        lastWeekWithHours: weeks[0]?.weekEnding ?? null,
      }
    })
}

/** The viewer's list: the name and the classification, nothing else (spec/02 §3). */
export function workerNames(tenantId: Uuid, filter: WorkerListFilter = {}): WorkerNameDTO[] {
  return db.workers
    .filter((w) => w.tenantId === tenantId && matches(w, filter))
    .sort(byName)
    .map((w) => ({
      id: w.id,
      displayName: displayName(w),
      status: w.status,
      defaultClassification: classificationRef(w.defaultClassificationId),
    }))
}

export function workerName(tenantId: Uuid, workerId: Uuid): WorkerNameDTO | null {
  const w = workerOf(tenantId, workerId)
  return w ? (workerNames(tenantId).find((x) => x.id === w.id) ?? null) : null
}

function annualHoursBasis(tenantId: Uuid): string {
  return db.tenants.find((t) => t.id === tenantId)?.settings.annualHoursBasis ?? '2080'
}

function planInput(p: (typeof db.fringePlans)[number]) {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    funding: p.funding,
    annualCost: p.annualCost,
    annualHoursBasis: p.annualHoursBasis,
    hourlyCredit: p.hourlyCredit,
    annualize: p.annualize,
    isLegallyRequired: p.isLegallyRequired,
  }
}

export function workerForm(tenantId: Uuid, workerId: Uuid | null): WorkerFormDTO | null {
  const w = workerId === null ? undefined : workerOf(tenantId, workerId)
  if (workerId !== null && !w) return null
  const record = w && db.apprenticeRecords.find((a) => a.workerId === w.id)
  const classifications = db.classificationCatalog
    .map((c) => ({ id: c.id, name: c.officialLabel }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    workerId: w?.id ?? null,
    displayName: w ? displayName(w) : '',
    values: {
      firstName: w?.firstName ?? '',
      middleName: w?.middleName ?? '',
      lastName: w?.lastName ?? '',
      workerNumber: w?.workerNumber ?? '',
      defaultClassificationId: w?.defaultClassificationId ?? '',
      level: w?.level ?? 'J',
      hireDate: w?.hireDate ?? '',
      status: w?.status ?? 'active',
      apprentice: record
        ? {
            programName: record.programName,
            registrar: record.registrar ?? '',
            programRegistrationNo: record.programRegistrationNo ?? '',
            trade: record.trade,
            periodNo: String(record.periodNo),
            pctOfJourney: record.pctOfJourney,
            validFrom: record.validFrom,
            validTo: record.validTo ?? '',
          }
        : null,
    },
    pii: w ? piiState(tenantId, w.id) : { hasSsnLast4: false, hasDateOfBirth: false, place: null },
    classifications,
    fringe: w
      ? db.fringeAllocations
          .filter((a) => a.workerId === w.id && a.tenantId === tenantId)
          .flatMap((a) => {
            const plan = db.fringePlans.find((p) => p.id === a.fringePlanId)
            if (!plan) return []
            const credit = planCredit(
              planInput(plan),
              {
                planId: plan.id,
                hourlyCreditOverride: a.hourlyCreditOverride,
                effectiveFrom: a.effectiveFrom,
                effectiveTo: a.effectiveTo,
              },
              annualHoursBasis(tenantId),
            )
            return [
              {
                allocationId: a.id,
                planId: plan.id,
                planName: plan.name,
                creditPerHour: credit.hourly.isZero() ? null : rate(credit.hourly),
                override: a.hourlyCreditOverride ?? '',
                from: a.effectiveFrom,
                to: a.effectiveTo,
              },
            ]
          })
          .sort((x, y) => x.planName.localeCompare(y.planName) || x.from.localeCompare(y.from))
      : [],
    plans: db.fringePlans
      .filter((p) => p.tenantId === tenantId)
      .map((p) => ({ id: p.id, name: p.name })),
    history: w ? weeksWorked(w.id) : [],
  }
}

function numberTaken(tenantId: Uuid, input: WorkerInput, selfId: Uuid | null) {
  if (input.workerNumber === '') return undefined
  return db.workers.find(
    (w) => w.tenantId === tenantId && w.id !== selfId && w.workerNumber === input.workerNumber,
  )
}

/** The checks that need data: a unique worker number, and SSN4 or DOB against what is on file. */
function dataErrors(
  tenantId: Uuid,
  input: WorkerInput,
  selfId: Uuid | null,
): WorkerSaveResult | null {
  const taken = numberTaken(tenantId, input, selfId)
  if (taken) {
    return {
      ok: false,
      errors: { workerNumber: { code: 'numberTaken', values: { Worker: displayName(taken) } } },
    }
  }
  const stored = selfId ? identifiersOnFile(tenantId, selfId) : { ssnLast4: '', dateOfBirth: '' }
  const issue = identifierIssue(
    input.ssnLast4 ?? stored.ssnLast4,
    input.dateOfBirth ?? stored.dateOfBirth,
  )
  return issue ? { ok: false, errors: { ssnLast4: { code: issue } } } : null
}

function saveApprentice(tenantId: Uuid, workerId: Uuid, input: WorkerInput) {
  const others = db.apprenticeRecords.filter((a) => a.workerId !== workerId)
  const existing = db.apprenticeRecords.find((a) => a.workerId === workerId)
  const a = input.level === 'RA' ? input.apprentice : null
  const next = a
    ? [
        {
          id: existing?.id ?? newId('0192b000', db.apprenticeRecords.length),
          tenantId,
          workerId,
          programName: a.programName,
          programRegistrationNo: a.programRegistrationNo || null,
          registrar: a.registrar || null,
          sponsor: existing?.sponsor ?? null,
          trade: a.trade,
          periodNo: Number(a.periodNo),
          // numeric(5,2): two places, the same rounding as money.
          pctOfJourney: money(a.pctOfJourney),
          validFrom: a.validFrom,
          validTo: a.validTo || null,
        },
      ]
    : []
  db.apprenticeRecords.splice(0, db.apprenticeRecords.length, ...others, ...next)
}

function fieldsOf(input: WorkerInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    middleName: input.middleName || null,
    workerNumber: input.workerNumber || null,
    defaultClassificationId: input.defaultClassificationId || null,
    level: input.level,
    hireDate: input.hireDate || null,
    status: input.status,
  }
}

export function createWorker(tenantId: Uuid, input: WorkerInput): WorkerSaveResult {
  const refused = dataErrors(tenantId, input, null)
  if (refused) return refused
  const id = newId('01927000', db.workers.length)
  db.workers.push({ id, tenantId, ...fieldsOf(input) })
  writePii(tenantId, id, input)
  saveApprentice(tenantId, id, input)
  return { ok: true, id }
}

export function updateWorker(tenantId: Uuid, workerId: Uuid, input: WorkerInput): WorkerSaveResult {
  const w = workerOf(tenantId, workerId)
  if (!w) throw new Error(`Unknown worker ${workerId}`)
  const refused = dataErrors(tenantId, input, workerId)
  if (refused) return refused
  Object.assign(w, fieldsOf(input))
  writePii(tenantId, workerId, input)
  saveApprentice(tenantId, workerId, input)
  return { ok: true, id: workerId }
}

// ---------------------------------------------------------------------------
// Fringe plans

export function fringePlans(tenantId: Uuid): FringePlansDTO {
  return {
    annualHoursBasis: annualHoursBasis(tenantId),
    plans: db.fringePlans
      .filter((p) => p.tenantId === tenantId)
      .map(
        (p): FringePlanDTO => ({
          id: p.id,
          name: p.name,
          kind: p.kind,
          funding: p.funding,
          planNumber: p.planNumber,
          provider: p.provider,
          annualize: p.annualize,
          annualCost: p.annualCost,
          annualHoursBasis: p.annualHoursBasis,
          hourlyCredit: p.hourlyCredit,
          isLegallyRequired: p.isLegallyRequired,
          workerCount: new Set(
            db.fringeAllocations.filter((a) => a.fringePlanId === p.id).map((a) => a.workerId),
          ).size,
        }),
      ),
  }
}

function planFields(input: FringePlanInput) {
  return {
    name: input.name,
    kind: input.kind,
    funding: input.funding,
    planNumber: input.planNumber || null,
    provider: input.provider || null,
    hourlyCredit: input.hourlyCredit || null,
    annualCost: input.annualCost || null,
    annualHoursBasis: input.annualHoursBasis || null,
    annualize: input.annualize,
    isLegallyRequired: input.isLegallyRequired,
  }
}

export function createFringePlan(tenantId: Uuid, input: FringePlanInput): FringeSaveResult {
  const id = newId('01929000', db.fringePlans.length)
  db.fringePlans.push({ id, tenantId, ...planFields(input) })
  return { ok: true, id }
}

export function updateFringePlan(
  tenantId: Uuid,
  planId: Uuid,
  input: FringePlanInput,
): FringeSaveResult {
  const plan = db.fringePlans.find((p) => p.id === planId && p.tenantId === tenantId)
  if (!plan) throw new Error(`Unknown plan ${planId}`)
  Object.assign(plan, planFields(input))
  return { ok: true, id: planId }
}

// ---------------------------------------------------------------------------
// Fringe plans per worker (worker_fringe_allocations, spec/04 §3.5). The engine
// reads the same rows through buildWeekInput, so a change here is the credit
// the grid computes with.

function allocationFields(input: AllocationInput) {
  return {
    fringePlanId: input.fringePlanId,
    hourlyCreditOverride: input.hourlyCreditOverride || null,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo || null,
  }
}

/** U (worker_id, fringe_plan_id, effective_from). */
function allocationTaken(workerId: Uuid, input: AllocationInput, selfId: Uuid | null) {
  return db.fringeAllocations.some(
    (a) =>
      a.id !== selfId &&
      a.workerId === workerId &&
      a.fringePlanId === input.fringePlanId &&
      a.effectiveFrom === input.effectiveFrom,
  )
}

function ownPlan(tenantId: Uuid, planId: Uuid): boolean {
  return db.fringePlans.some((p) => p.id === planId && p.tenantId === tenantId)
}

export function addAllocation(
  tenantId: Uuid,
  workerId: Uuid,
  input: AllocationInput,
): AllocationSaveResult {
  if (!workerOf(tenantId, workerId)) throw new Error(`Unknown worker ${workerId}`)
  if (!ownPlan(tenantId, input.fringePlanId)) throw new Error(`Unknown plan ${input.fringePlanId}`)
  if (allocationTaken(workerId, input, null)) {
    return { ok: false, errors: { effectiveFrom: 'allocationTaken' } }
  }
  db.fringeAllocations.push({
    id: newId('0192a000', db.fringeAllocations.length),
    tenantId,
    workerId,
    ...allocationFields(input),
  })
  return { ok: true }
}

export function updateAllocation(
  tenantId: Uuid,
  workerId: Uuid,
  allocationId: Uuid,
  input: AllocationInput,
): AllocationSaveResult {
  const row = db.fringeAllocations.find(
    (a) => a.id === allocationId && a.workerId === workerId && a.tenantId === tenantId,
  )
  if (!row) throw new Error(`Unknown allocation ${allocationId}`)
  if (!ownPlan(tenantId, input.fringePlanId)) throw new Error(`Unknown plan ${input.fringePlanId}`)
  if (allocationTaken(workerId, input, allocationId)) {
    return { ok: false, errors: { effectiveFrom: 'allocationTaken' } }
  }
  Object.assign(row, allocationFields(input))
  return { ok: true }
}
