// computeWeek: the one entry point of the engine (spec/01 §4).
//
// Same input, same output, no I/O. The browser runs it on every keystroke in
// the grid (spec/19 §6) and the server runs the very same code before it writes
// payroll_lines, so the two can never disagree.
import { dec, hours as fmtHours, rate as fmtRate, money, sum, ZERO } from '../money.ts'
import { validateWeek } from '../validate/validate.ts'
import type { RowModel, WeekModel, WorkerModel } from './model.ts'
import { buildModel } from './model.ts'
import {
  type DaySplit,
  type LineRow,
  type WeekInput,
  WeekInputSchema,
  type WeekResult,
  type WorkerResult,
  type WorkerSupplement,
} from './types.ts'

/** Written onto every payroll_lines row, so an old report can be explained. */
export const ENGINE_VERSION = '1.0.0'

function displayName(row: RowModel, model: WeekModel): string {
  if (row.classification) return row.classification.displayLabel
  const any = model.input.classifications.find(
    (item) => item.classificationId === row.classificationId,
  )
  return any?.displayLabel ?? row.classificationId
}

function otCodesOf(row: RowModel, model: WeekModel): string[] {
  if (row.classification) return [...row.classification.otCodes]
  const any = model.input.classifications.find(
    (item) => item.classificationId === row.classificationId,
  )
  return [...(any?.otCodes ?? [])]
}

function daysOf(row: RowModel, model: WeekModel): DaySplit[] {
  return model.days.map((date) => {
    const cells = row.cells.filter((cell) => cell.entry.workDate === date)
    return {
      date,
      st: fmtHours(sum(cells.map((cell) => cell.stHours))),
      ot: fmtHours(sum(cells.map((cell) => cell.otHours))),
      manual: cells.some((cell) => cell.nySplit.manual),
      holiday: cells.some((cell) => cell.entry.isHoliday),
    }
  })
}

function toLineRow(row: RowModel, model: WeekModel): LineRow {
  const otRate = row.otHours.gt(ZERO) ? row.otRate : row.rate.times(dec('1.5'))
  return {
    id: row.key,
    workerId: row.worker.id,
    workerName: `${row.worker.lastName}, ${row.worker.firstName}`,
    classificationId: row.classificationId,
    classificationName: displayName(row, model),
    otCodes: otCodesOf(row, model),
    isApprentice: row.isApprentice,
    apprenticeLevel: row.worker.apprentice ? String(row.worker.apprentice.periodNo) : null,
    baseRate: money(row.classification ? row.classification.wdBaseRate : '0'),
    supplementRate: money(row.supplementRate),
    stRate: money(row.rate),
    otRate: money(otRate),
    otSupplementRate: money(row.otSupplementRate),
    otHourlyTotal: money(otRate.plus(row.otSupplementRate)),
    days: daysOf(row, model),
    totalHours: fmtHours(row.totalHours),
    stHours: fmtHours(row.stHours),
    otHours: fmtHours(row.otHours),
    grossProject: money(row.stWage.plus(row.otWage)),
    fringeCreditHourly: fmtRate(row.fringe.creditHourly),
    cashInLieuHourly: fmtRate(row.fringe.cashHourly),
    fringeRequiredHourly: fmtRate(row.fringe.requiredHourly),
    fringeShortfallHourly: fmtRate(row.fringe.shortfallHourly),
    fringeStatus: row.fringe.status,
  }
}

/**
 * The supplements of one worker, by plan, with the straight-time and the
 * overtime amount per hour. The NY file carries them as their own block, not
 * as a field on the classification (spec/05 §3.2).
 */
function supplementsOf(worker: WorkerModel): WorkerSupplement[] {
  const out: WorkerSupplement[] = []
  const stHours = worker.stHours
  const otHours = worker.otHours
  for (const row of worker.rows) {
    for (const credit of row.credits) {
      if (credit.hourly.lte(ZERO)) continue
      const paidTo = credit.funding === 'cash_in_lieu' ? 'cash' : 'plan'
      const factor = row.paidSupplementHourly.gt(ZERO)
        ? row.otSupplementRate.div(row.paidSupplementHourly)
        : dec('1')
      const otHourly = credit.hourly.times(factor)
      out.push({
        planId: credit.planId,
        kind: credit.kind,
        paidTo,
        stHourlyAmount: fmtRate(credit.hourly),
        otHourlyAmount: fmtRate(otHourly),
        totalAmount: money(credit.hourly.times(stHours).plus(otHourly.times(otHours))),
      })
    }
    if (row.fringe.cashHourly.gt(ZERO) && row.classification) {
      const cash = dec(row.classification.cashInLieuRate)
      if (cash.gt(ZERO)) {
        const factor = row.paidSupplementHourly.gt(ZERO)
          ? row.otSupplementRate.div(row.paidSupplementHourly)
          : dec('1')
        out.push({
          planId: null,
          kind: 'other',
          paidTo: 'cash',
          stHourlyAmount: fmtRate(cash),
          otHourlyAmount: fmtRate(cash.times(factor)),
          totalAmount: money(cash.times(row.stHours).plus(cash.times(factor).times(row.otHours))),
        })
      }
    }
  }
  return out
}

function toWorkerResult(worker: WorkerModel): WorkerResult {
  return {
    workerId: worker.worker.id,
    workerName: `${worker.worker.lastName}, ${worker.worker.firstName}`,
    stHours: fmtHours(worker.stHours),
    otHours: fmtHours(worker.otHours),
    totalHours: fmtHours(worker.totalHours),
    regularRate: fmtRate(worker.regularRate),
    regularRateMethod: worker.regularRateMethod,
    otMethod: worker.otMethod,
    grossThisProject: money(worker.grossThisProject),
    grossAllWork: money(worker.grossAllWork),
    deductionsTotal: money(worker.deductionsTotal),
    netPay: money(worker.netPay),
    fringeShortfallHourly: fmtRate(worker.fringeShortfallHourly),
    apprenticeApplied: worker.apprenticeApplied,
    supplements: supplementsOf(worker),
  }
}

/** Parse, compute, validate. Anything the schema rejects is a programming error. */
export function computeWeek(raw: WeekInput | unknown): WeekResult {
  const input = WeekInputSchema.parse(raw)
  const model = buildModel(input)
  return {
    engineVersion: ENGINE_VERSION,
    weekEnding: input.period.weekEnding,
    days: model.days,
    rows: model.rows.map((row) => toLineRow(row, model)),
    workers: model.workers.map(toWorkerResult),
    totals: {
      byDay: model.totalsByDay.map((value) => fmtHours(value)),
      st: fmtHours(model.totalSt),
      ot: fmtHours(model.totalOt),
      gross: money(model.totalGross),
    },
    findings: validateWeek(model),
  }
}
