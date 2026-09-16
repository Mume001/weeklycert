// The week, worked out. Everything the engine knows after reading the input
// once: which classification rate applies to which day, how the hours split,
// what one hour of overtime is worth, and what the supplement covers.
//
// This file computes. It never decides whether something is wrong; that is
// `validate/`, which reads this model and writes the findings (spec/07 §4).
import { type Dow, dayOfWeek, weekDates } from '../dates.ts'
import { type Dec, dec, ONE, sum, ZERO } from '../money.ts'
import { apprenticeRate, recordCovers } from './apprentice.ts'
import {
  allocationsOn,
  type FringePosition,
  fringePosition,
  type PlanCredit,
  planCredit,
} from './fringe.ts'
import { type SupplementPremium, supplementPremium } from './ot-codes.ts'
import {
  type Cell,
  type CellSplit,
  federalOvertime,
  federalWage,
  nyWage,
  regularRate,
  splitByCodes,
} from './overtime.ts'
import type {
  ClassificationInput,
  TimeEntryInput,
  WeekInput,
  WorkerInput,
  WorkerPayrollInput,
} from './types.ts'

export interface CellModel {
  entry: TimeEntryInput
  cell: Cell
  /** The classification version in force on that day, null when there is none. */
  classification: ClassificationInput | null
  /** Column 0 to 6 of the grid, -1 when the date is outside the week. */
  dayIndex: number
  hours: Dec
  stHours: Dec
  otHours: Dec
  stWage: Dec
  otWage: Dec
  /** What the NY codes alone would have produced, for OT_NY_CODE. */
  nySplit: CellSplit
  federalOtHours: Dec
}

export interface RowModel {
  /** `${workerId}:${classificationId}` (spec/19 §3). */
  key: string
  worker: WorkerInput
  classificationId: string
  /** The version used for the row's rates: the one of its last worked day. */
  classification: ClassificationInput | null
  /** Set when the classification exists on the project but not for these dates. */
  rateExpired: boolean
  onProject: boolean
  cells: CellModel[]
  rate: Dec
  stHours: Dec
  otHours: Dec
  totalHours: Dec
  stWage: Dec
  otWage: Dec
  otRate: Dec
  supplementRate: Dec
  paidSupplementHourly: Dec
  otSupplementRate: Dec
  supplementPremiumKind: SupplementPremium
  credits: PlanCredit[]
  fringe: FringePosition
  isApprentice: boolean
  apprenticeApplied: boolean
  /** The rate the payroll actually paid, when it was imported. */
  paidStRate: Dec | null
  expectedApprenticeRate: Dec | null
}

export interface WorkerModel {
  worker: WorkerInput
  rows: RowModel[]
  cells: CellModel[]
  stHours: Dec
  otHours: Dec
  totalHours: Dec
  regularRate: Dec
  regularRateMethod: 'single' | 'weighted_average'
  otMethod: 'ny' | 'federal' | 'equal'
  grossThisProject: Dec
  grossAllWork: Dec
  deductionsTotal: Dec
  netPay: Dec
  payroll: WorkerPayrollInput | null
  fringeShortfallHourly: Dec
  apprenticeApplied: boolean
}

export interface WeekModel {
  input: WeekInput
  /** The seven columns: weekEnding minus 6 days first (spec/05 §4). */
  days: string[]
  workers: WorkerModel[]
  rows: RowModel[]
  /** Entries whose date falls outside the period (DATE_OUTSIDE_WEEK). */
  outsideWeek: TimeEntryInput[]
  totalsByDay: Dec[]
  totalSt: Dec
  totalOt: Dec
  totalGross: Dec
}

/** The classification version in force on a date, newest effective_from first. */
export function classificationOn(
  classifications: readonly ClassificationInput[],
  classificationId: string,
  date: string,
): ClassificationInput | null {
  const matches = classifications
    .filter(
      (row) =>
        row.classificationId === classificationId &&
        row.effectiveFrom <= date &&
        (row.effectiveTo === null || row.effectiveTo >= date),
    )
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))
  return matches[0] ?? null
}

function isOnProject(
  classifications: readonly ClassificationInput[],
  classificationId: string,
): boolean {
  return classifications.some((row) => row.classificationId === classificationId)
}

function workerRate(
  worker: WorkerInput,
  classification: ClassificationInput | null,
  entry: TimeEntryInput,
): { rate: Dec; applied: boolean; expected: Dec | null } {
  if (!classification) return { rate: ZERO, applied: false, expected: null }
  const journey = dec(classification.paidBaseRate)
  const record = worker.apprentice
  const registered =
    worker.level === 'RA' && record !== null && recordCovers(record, entry.workDate)
  const expected = registered && record ? apprenticeRate(journey, record.pctOfJourney) : null
  // An apprentice without a valid registration is owed the full journeyworker
  // rate (spec/01 §2.4); the finding says so, and the engine pays it.
  const derived = expected ?? journey
  return {
    rate: entry.paidStRate === null ? derived : dec(entry.paidStRate),
    applied: registered,
    expected,
  }
}

function buildCell(
  entry: TimeEntryInput,
  classification: ClassificationInput | null,
  rate: Dec,
  days: readonly string[],
): { cell: Cell; dayIndex: number } {
  return {
    cell: {
      rowKey: `${entry.workerId}:${entry.classificationId}`,
      date: entry.workDate,
      dow: dayOfWeek(entry.workDate) as Dow,
      hours: dec(entry.hours),
      isHoliday: entry.isHoliday,
      holidayMultiplier: entry.holidayMultiplier === null ? null : dec(entry.holidayMultiplier),
      manualSt: entry.stOverride === null ? null : dec(entry.stOverride),
      manualOt: entry.otOverride === null ? null : dec(entry.otOverride),
      otCodes: classification?.otCodes ?? [],
      rate,
    },
    dayIndex: days.indexOf(entry.workDate),
  }
}

function supplementFactor(kind: SupplementPremium, effectiveMultiplier: Dec): Dec {
  if (kind === 'one_and_a_half') return dec('1.5')
  if (kind === 'same_as_overtime') return effectiveMultiplier
  return ONE
}

export function buildModel(input: WeekInput): WeekModel {
  const days = weekDates(input.period.weekEnding)
  const outsideWeek = input.entries.filter((entry) => !days.includes(entry.workDate))
  const workers: WorkerModel[] = []
  const allRows: RowModel[] = []

  for (const worker of input.workers) {
    const entries = input.entries
      .filter((entry) => entry.workerId === worker.id)
      .sort((a, b) =>
        a.workDate === b.workDate
          ? a.classificationId.localeCompare(b.classificationId)
          : a.workDate.localeCompare(b.workDate),
      )
    if (entries.length === 0) continue

    const prepared = entries.map((entry) => {
      const classification = classificationOn(
        input.classifications,
        entry.classificationId,
        entry.workDate,
      )
      const { rate, applied, expected } = workerRate(worker, classification, entry)
      const { cell, dayIndex } = buildCell(entry, classification, rate, days)
      return { entry, classification, cell, dayIndex, applied, expected }
    })

    const cells = prepared.map((item) => item.cell)
    const nySplits = splitByCodes(cells)
    const federalOt = federalOvertime(cells)
    const { value: rrValue, method: rrMethod } = regularRate(cells)

    const nyApplies = input.project.nyReporting
    const federalApplies = input.tenant.federalOtEnabled
    const nyTotal = nyApplies ? nyWage(cells, nySplits) : ZERO
    const federalTotal = federalApplies ? federalWage(cells, federalOt) : ZERO

    // Both rules are applied and the one that pays more wins (spec/01 §2.1).
    let otMethod: 'ny' | 'federal' | 'equal' = 'ny'
    if (!nyApplies && !federalApplies) otMethod = 'ny'
    else if (!nyApplies) otMethod = 'federal'
    else if (!federalApplies) otMethod = 'ny'
    else if (federalTotal.gt(nyTotal)) otMethod = 'federal'
    else if (federalTotal.eq(nyTotal)) otMethod = 'equal'

    const useFederal = otMethod === 'federal'
    const halfRate = rrValue.div(2)

    const cellModels: CellModel[] = prepared.map((item, index) => {
      const split = nySplits[index]
      const fedOt = federalOt[index] ?? ZERO
      const hours = item.cell.hours
      const noOvertime = !nyApplies && !federalApplies
      // A split the user typed stays as they typed it, whichever rule pays more.
      // They may know about an approved 4x10 the engine cannot see (spec/07 §5),
      // and a split that is wrong has to stay visible, because that is what
      // OT_FEDERAL_UNDERCOUNT and OT_NY_CODE report.
      let stHours = hours
      let otHours = ZERO
      let otWage = ZERO
      if (split?.manual === true) {
        stHours = split.st
        otHours = split.ot
        otWage = split.otMultiplierHours.times(item.cell.rate)
      } else if (useFederal) {
        stHours = hours.minus(fedOt)
        otHours = fedOt
        otWage = fedOt.times(item.cell.rate.plus(halfRate))
      } else if (!noOvertime && split) {
        stHours = split.st
        otHours = split.ot
        otWage = split.otMultiplierHours.times(item.cell.rate)
      }
      const stWage = stHours.times(item.cell.rate)
      return {
        entry: item.entry,
        cell: item.cell,
        classification: item.classification,
        dayIndex: item.dayIndex,
        hours,
        stHours,
        otHours,
        stWage,
        otWage,
        nySplit: split ?? {
          st: hours,
          ot: ZERO,
          otMultiplierHours: ZERO,
          manual: false,
          codeSt: hours,
          codeOt: ZERO,
          topMultiplier: ONE,
        },
        federalOtHours: fedOt,
      }
    })

    const rows = buildRows(worker, cellModels, prepared, input)
    allRows.push(...rows)

    const stHours = sum(cellModels.map((cell) => cell.stHours))
    const otHours = sum(cellModels.map((cell) => cell.otHours))
    const grossThisProject = sum(cellModels.map((cell) => cell.stWage.plus(cell.otWage)))
    const payroll = input.payroll.find((row) => row.workerId === worker.id) ?? null
    const deductionsTotal = sum((payroll?.deductions ?? []).map((item) => dec(item.amount)))
    const grossAllWork =
      payroll?.grossAllWork === null || payroll?.grossAllWork === undefined
        ? grossThisProject
        : dec(payroll.grossAllWork)
    const netPay =
      payroll?.netPay === null || payroll?.netPay === undefined
        ? grossAllWork.minus(deductionsTotal)
        : dec(payroll.netPay)

    workers.push({
      worker,
      rows,
      cells: cellModels,
      stHours,
      otHours,
      totalHours: stHours.plus(otHours),
      regularRate: rrValue,
      regularRateMethod: rrMethod,
      otMethod,
      grossThisProject,
      grossAllWork,
      deductionsTotal,
      netPay,
      payroll,
      fringeShortfallHourly: rows.reduce(
        (worst, row) => (row.fringe.shortfallHourly.gt(worst) ? row.fringe.shortfallHourly : worst),
        ZERO,
      ),
      apprenticeApplied: rows.some((row) => row.apprenticeApplied),
    })
  }

  const totalsByDay = days.map((_, index) =>
    sum(
      allRows.flatMap((row) =>
        row.cells.filter((cell) => cell.dayIndex === index).map((cell) => cell.hours),
      ),
    ),
  )

  return {
    input,
    days: [...days],
    workers,
    rows: allRows,
    outsideWeek,
    totalsByDay,
    totalSt: sum(workers.map((worker) => worker.stHours)),
    totalOt: sum(workers.map((worker) => worker.otHours)),
    totalGross: sum(workers.map((worker) => worker.grossThisProject)),
  }
}

function buildRows(
  worker: WorkerInput,
  cellModels: readonly CellModel[],
  prepared: readonly { applied: boolean; expected: Dec | null }[],
  input: WeekInput,
): RowModel[] {
  const byRow = new Map<string, { cells: CellModel[]; applied: boolean; expected: Dec | null }>()
  cellModels.forEach((cell, index) => {
    const key = cell.cell.rowKey
    const item = prepared[index]
    const existing = byRow.get(key)
    if (existing) {
      existing.cells.push(cell)
      existing.applied = existing.applied || (item?.applied ?? false)
      existing.expected = existing.expected ?? item?.expected ?? null
    } else {
      byRow.set(key, {
        cells: [cell],
        applied: item?.applied ?? false,
        expected: item?.expected ?? null,
      })
    }
  })

  const rows: RowModel[] = []
  for (const [key, group] of byRow) {
    const last = group.cells[group.cells.length - 1]
    if (!last) continue
    const classificationId = last.entry.classificationId
    const classification = last.classification
    const stHours = sum(group.cells.map((cell) => cell.stHours))
    const otHours = sum(group.cells.map((cell) => cell.otHours))
    const stWage = sum(group.cells.map((cell) => cell.stWage))
    const otWage = sum(group.cells.map((cell) => cell.otWage))
    const rate = last.cell.rate

    const weekEnding = input.period.weekEnding
    const allocations = allocationsOn(worker.allocations, weekEnding)
    const credits: PlanCredit[] = []
    for (const allocation of allocations) {
      const plan = input.plans.find((item) => item.id === allocation.planId)
      if (plan) credits.push(planCredit(plan, allocation, input.tenant.annualHoursBasis))
    }
    const cashInLieu = classification ? dec(classification.cashInLieuRate) : ZERO
    const required = classification ? dec(classification.wdFringeRate) : ZERO
    const fringe = fringePosition(credits, cashInLieu, required)

    const premiumKind = supplementPremium(classification?.otCodes ?? [])
    const effectiveMultiplier =
      otHours.gt(ZERO) && rate.gt(ZERO) ? otWage.div(otHours).div(rate) : dec('1.5')
    const paidSupplement = fringe.creditHourly.plus(fringe.cashHourly)
    const otRate = otHours.gt(ZERO) ? otWage.div(otHours) : rate

    rows.push({
      key,
      worker,
      classificationId,
      classification,
      rateExpired: classification === null && isOnProject(input.classifications, classificationId),
      onProject: isOnProject(input.classifications, classificationId),
      cells: group.cells,
      rate,
      stHours,
      otHours,
      totalHours: stHours.plus(otHours),
      stWage,
      otWage,
      otRate,
      supplementRate: classification ? dec(classification.wdFringeRate) : ZERO,
      paidSupplementHourly: paidSupplement,
      otSupplementRate: paidSupplement.times(supplementFactor(premiumKind, effectiveMultiplier)),
      supplementPremiumKind: premiumKind,
      credits,
      fringe,
      isApprentice: worker.level === 'RA',
      apprenticeApplied: group.applied,
      paidStRate: last.entry.paidStRate === null ? null : dec(last.entry.paidStRate),
      expectedApprenticeRate: group.expected,
    })
  }
  return rows
}
