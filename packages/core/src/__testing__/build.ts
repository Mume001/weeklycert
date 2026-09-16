// Building an input for a test without repeating the whole shape of a week.
// Not part of the engine: nothing in src/ imports it.
import { weekDates } from '../dates.ts'

export const WEEK_ENDING = '2026-09-12'

type Row = Record<string, unknown>

export function classification(partial: Row = {}): Row {
  return {
    id: 'pc-1',
    classificationId: 'cls-1',
    officialLabel: 'Electrician – Inside Wireman',
    displayLabel: 'Electrician – Inside Wireman',
    wdBaseRate: '16.00',
    wdFringeRate: '2.50',
    paidBaseRate: '16.00',
    cashInLieuRate: '2.50',
    otCodes: ['B'],
    effectiveFrom: '2026-07-01',
    effectiveTo: null,
    ...partial,
  }
}

export function worker(partial: Row = {}): Row {
  return {
    id: 'w-1',
    firstName: 'John',
    lastName: 'Doe',
    level: 'J',
    status: 'active',
    ssnLast4: '1234',
    address: {
      address1: '1 Main Street',
      city: 'Poughkeepsie',
      state: 'NY',
      postalCode: '12601',
    },
    ...partial,
  }
}

export function apprentice(partial: Row = {}): Row {
  return {
    programName: 'Mid-Hudson Electrical Apprenticeship Program',
    periodNo: 2,
    pctOfJourney: '55.00',
    validFrom: '2026-03-01',
    validTo: null,
    ...partial,
  }
}

export function plan(partial: Row = {}): Row {
  return {
    id: 'plan-1',
    name: 'Local 3 Health Fund',
    kind: 'health_welfare',
    funding: 'plan_contribution',
    annualCost: null,
    annualHoursBasis: null,
    hourlyCredit: '2.50',
    annualize: true,
    isLegallyRequired: false,
    ...partial,
  }
}

export function allocation(partial: Row = {}): Row {
  return {
    planId: 'plan-1',
    hourlyCreditOverride: null,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    ...partial,
  }
}

export function project(partial: Row = {}): Row {
  return {
    id: 'p-1',
    name: 'Dutchess County Courthouse Lighting',
    prcNumber: '2010008390',
    nyReporting: true,
    federalReporting: false,
    startDate: '2026-04-06',
    ...partial,
  }
}

export function period(partial: Row = {}): Row {
  return {
    id: 'per-1',
    weekEnding: WEEK_ENDING,
    weekEndsOn: 6,
    status: 'open',
    ...partial,
  }
}

/** Hours per column, first column is weekEnding minus 6 days (spec/05 §4). */
export function entries(
  days: readonly (string | null)[],
  partial: Row = {},
  weekEnding: string = WEEK_ENDING,
): Row[] {
  const dates = weekDates(weekEnding)
  return days.flatMap((value, index) => {
    const date = dates[index]
    if (value === null || !date) return []
    return [
      {
        workerId: 'w-1',
        classificationId: 'cls-1',
        workDate: date,
        hours: value,
        ...partial,
      },
    ]
  })
}

/** Monday to Friday, eight hours a day: the week nothing is wrong with. */
export const FIVE_DAYS = [null, '8', '8', '8', '8', '8', null] as const

export function week(partial: Row = {}): Row {
  return {
    project: project(),
    period: period(),
    classifications: [classification()],
    workers: [worker()],
    plans: [],
    entries: [],
    ...partial,
  }
}
