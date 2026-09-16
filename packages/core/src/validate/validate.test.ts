// One test that makes each finding fire and one that keeps it quiet, for every
// code in the catalogue (spec/07 §6, spec/12 step 2).
//
// The quiet case is deliberately a near miss wherever there is a threshold: 16
// hours next to 17, ten deductions next to eleven, a ratio exactly at its limit.
// A rule that only fires on something absurd is not a tested rule.
import { describe, expect, it } from 'vitest'
import {
  allocation,
  apprentice,
  classification,
  entries,
  FIVE_DAYS,
  period,
  plan,
  project,
  week,
  worker,
} from '../__testing__/build.ts'
import { computeWeek } from '../engine/compute.ts'
import { AUTO_FIXABLE, FINDING_CODES, FINDINGS, type FindingCode } from './codes.ts'

type Row = Record<string, unknown>

/** The week nothing is wrong with; every case below bends one thing in it. */
function clean(partial: Row = {}): Row {
  return week({ entries: entries(FIVE_DAYS), ...partial })
}

function codesOf(input: Row): string[] {
  return computeWeek(input).findings.map((finding) => finding.code)
}

function findingOf(input: Row, code: FindingCode) {
  return computeWeek(input).findings.find((finding) => finding.code === code)
}

function withDays(days: readonly (string | null)[], partial: Row = {}): Row {
  return week({ entries: entries(days), ...partial })
}

function deductions(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: 'union_dues',
    amount: '1.00',
    label: `Line ${index + 1}`,
  }))
}

function crowd(count: number): Row {
  const workers: Row[] = []
  const rows: Row[] = []
  for (let index = 0; index < count; index++) {
    const id = `w-${index}`
    workers.push(worker({ id, lastName: `Roe${index}`, ssnLast4: '1234' }))
    rows.push({
      workerId: id,
      classificationId: 'cls-1',
      workDate: '2026-09-07',
      hours: '8',
    })
  }
  return week({ workers, entries: rows })
}

const DEADLINE = { lastAcceptedSubmissionAt: '2026-08-26' }

interface Case {
  code: FindingCode
  fires: string
  input: Row
  quiet: string
  unless: Row
}

const CASES: Case[] = [
  // 3.1 Hours
  {
    code: 'DAY_OVER_24',
    fires: 'a worker has 25 hours in one day',
    input: withDays([null, '25', null, null, null, null, null]),
    quiet: 'the day is exactly 24 hours',
    unless: withDays([null, '24', null, null, null, null, null]),
  },
  {
    code: 'DAY_OVER_16',
    fires: 'a worker has 17 hours in one day',
    input: withDays([null, '17', null, null, null, null, null]),
    quiet: 'the day is exactly 16 hours',
    unless: withDays([null, '16', null, null, null, null, null]),
  },
  {
    code: 'NEGATIVE_HOURS',
    fires: 'a cell holds a negative number',
    input: withDays([null, '-1', null, null, null, null, null]),
    quiet: 'the cell is empty',
    unless: withDays([null, '0', null, null, null, null, null]),
  },
  {
    code: 'DATE_OUTSIDE_WEEK',
    fires: 'an entry falls the day after the week ends',
    input: week({
      entries: [{ workerId: 'w-1', classificationId: 'cls-1', workDate: '2026-09-13', hours: '8' }],
    }),
    quiet: 'the entry is the last day of the week',
    unless: week({
      entries: [{ workerId: 'w-1', classificationId: 'cls-1', workDate: '2026-09-12', hours: '8' }],
    }),
  },
  {
    code: 'NO_HOURS_NOT_MARKED',
    fires: 'the week is empty and not marked as a no work week',
    input: week({}),
    quiet: 'the week is marked as a no work week',
    unless: week({ period: period({ isNoWork: true }) }),
  },
  {
    code: 'NO_WORK_WITH_HOURS',
    fires: 'a no work week carries hours',
    input: clean({ period: period({ isNoWork: true }) }),
    quiet: 'the no work week is empty',
    unless: week({ period: period({ isNoWork: true }) }),
  },
  {
    code: 'WORKER_INACTIVE',
    fires: 'an inactive worker has hours',
    input: clean({ workers: [worker({ status: 'inactive' })] }),
    quiet: 'the worker is active',
    unless: clean(),
  },
  {
    code: 'WORKER_NO_CLASSIFICATION',
    fires: 'hours are entered without a classification',
    input: week({ entries: entries(FIVE_DAYS, { classificationId: '' }) }),
    quiet: 'the classification is set',
    unless: clean(),
  },
  {
    code: 'CLASSIFICATION_NOT_ON_PROJECT',
    fires: 'the classification has no rates on this project',
    input: week({ entries: entries(FIVE_DAYS, { classificationId: 'cls-9' }) }),
    quiet: 'the classification is on the project',
    unless: clean(),
  },
  {
    code: 'OT_SPLIT_MISMATCH',
    fires: 'the typed split does not add up to the day',
    input: week({ entries: entries(FIVE_DAYS, { stOverride: '8', otOverride: '1' }) }),
    quiet: 'the typed split adds up',
    unless: week({ entries: entries(FIVE_DAYS, { stOverride: '7', otOverride: '1' }) }),
  },
  {
    code: 'OT_FEDERAL_UNDERCOUNT',
    fires: 'a federal project carries 48 straight time hours',
    input: week({
      project: project({ nyReporting: false, federalReporting: true, federalWdNumber: 'NY1' }),
      classifications: [classification({ otCodes: [] })],
      entries: entries([null, '8', '8', '8', '8', '8', '8'], { stOverride: '8', otOverride: '0' }),
    }),
    quiet: 'the week stops at 40 straight time hours',
    unless: week({
      project: project({ nyReporting: false, federalReporting: true, federalWdNumber: 'NY1' }),
      classifications: [classification({ otCodes: [] })],
      entries: entries(FIVE_DAYS, { stOverride: '8', otOverride: '0' }),
    }),
  },
  {
    code: 'OT_NY_CODE',
    fires: 'nine hours are typed as straight time under code B',
    input: withDays([null, '9', null, null, null, null, null], {
      entries: entries([null, '9', null, null, null, null, null], {
        stOverride: '9',
        otOverride: '0',
      }),
    }),
    quiet: 'the ninth hour is typed as overtime',
    unless: week({
      entries: entries([null, '9', null, null, null, null, null], {
        stOverride: '8',
        otOverride: '1',
      }),
    }),
  },
  {
    code: 'OT_NY_CODE_MISSING',
    fires: 'a NY classification carries no overtime code',
    input: clean({ classifications: [classification({ otCodes: [] })] }),
    quiet: 'the codes are entered',
    unless: clean(),
  },
  {
    code: 'OT_NY_WEEKEND',
    fires: 'Saturday hours are typed as straight time under code E',
    input: week({
      classifications: [classification({ otCodes: ['B', 'E'] })],
      entries: entries([null, null, null, null, null, null, '8'], {
        stOverride: '8',
        otOverride: '0',
      }),
    }),
    quiet: 'the Saturday hours are typed as overtime',
    unless: week({
      classifications: [classification({ otCodes: ['B', 'E'] })],
      entries: entries([null, null, null, null, null, null, '8'], {
        stOverride: '0',
        otOverride: '8',
      }),
    }),
  },
  {
    code: 'OT_NY_MAKEUP_DAY',
    fires: 'code E2 allows a Saturday at the regular rate',
    input: week({
      classifications: [classification({ otCodes: ['B', 'E2'] })],
      entries: entries([null, null, null, null, null, null, '8'], {
        stOverride: '8',
        otOverride: '0',
      }),
    }),
    quiet: 'the classification carries no make-up code',
    unless: week({
      classifications: [classification({ otCodes: ['B'] })],
      entries: entries([null, null, null, null, null, null, '8'], {
        stOverride: '8',
        otOverride: '0',
      }),
    }),
  },
  {
    code: 'OT_NY_SUPPLEMENT_PREMIUM',
    fires: 'the classification carries code W',
    input: clean({ classifications: [classification({ otCodes: ['B', 'W'] })] }),
    quiet: 'no code touches the supplement',
    unless: clean(),
  },
  {
    code: 'HOLIDAY_RULE_UNKNOWN',
    fires: 'a day is marked as a holiday',
    input: week({ entries: entries(FIVE_DAYS, { isHoliday: true }) }),
    quiet: 'no day is marked',
    unless: clean(),
  },

  // 3.2 Rates and benefits
  {
    code: 'RATE_BELOW_WD',
    fires: 'the paid rate is under the wage determination',
    input: clean({ classifications: [classification({ paidBaseRate: '15.00' })] }),
    quiet: 'the paid rate matches the determination',
    unless: clean(),
  },
  {
    code: 'OT_RATE_BELOW_1_5',
    fires: 'the payroll reports an overtime rate under the premium owed',
    input: week({
      entries: entries([null, '9', null, null, null, null, null], { paidOtRate: '20.00' }),
    }),
    quiet: 'the reported overtime rate is the one owed',
    unless: week({
      entries: entries([null, '9', null, null, null, null, null], { paidOtRate: '24.00' }),
    }),
  },
  {
    code: 'OT_RATE_INCLUDES_FRINGE',
    fires: 'the overtime rate is 1.5 times the rate plus the benefit',
    input: week({
      entries: entries([null, '9', null, null, null, null, null], { paidOtRate: '27.75' }),
    }),
    quiet: 'the overtime rate is 1.5 times the base rate alone',
    unless: week({
      entries: entries([null, '9', null, null, null, null, null], { paidOtRate: '24.00' }),
    }),
  },
  {
    code: 'FRINGE_SHORTFALL',
    fires: 'nothing covers the fringe rate of the determination',
    input: clean({ classifications: [classification({ cashInLieuRate: '0.00' })] }),
    quiet: 'cash in lieu covers it exactly',
    unless: clean(),
  },
  {
    code: 'FRINGE_LEGALLY_REQUIRED',
    fires: 'a plan required by law is claimed as a benefit',
    input: clean({
      plans: [plan({ isLegallyRequired: true })],
      workers: [worker({ allocations: [allocation()] })],
    }),
    quiet: 'the plan is a real benefit plan',
    unless: clean({
      plans: [plan()],
      workers: [worker({ allocations: [allocation()] })],
    }),
  },
  {
    code: 'FRINGE_NOT_ANNUALIZED',
    fires: 'a plan has a yearly cost but no yearly hours',
    input: clean({
      plans: [plan({ hourlyCredit: null, annualCost: '7200.00', annualHoursBasis: null })],
      workers: [worker({ allocations: [allocation()] })],
    }),
    quiet: 'the yearly hours are entered',
    unless: clean({
      plans: [plan({ hourlyCredit: null, annualCost: '7200.00', annualHoursBasis: '2080' })],
      workers: [worker({ allocations: [allocation()] })],
    }),
  },
  {
    code: 'FRINGE_NO_ALLOCATION',
    fires: 'a worker has neither a plan nor cash in lieu',
    input: clean({ classifications: [classification({ cashInLieuRate: '0.00' })] }),
    quiet: 'cash in lieu is recorded on the classification',
    unless: clean(),
  },
  {
    code: 'RATE_EXPIRED',
    fires: 'the rates ran out before this week',
    input: clean({ classifications: [classification({ effectiveTo: '2026-06-30' })] }),
    quiet: 'the rates are open ended',
    unless: clean(),
  },
  {
    code: 'RATE_RETROACTIVE_CHANGE',
    fires: 'a correction reaches back into weeks already filed',
    input: clean({
      context: {
        today: '2026-09-15',
        retroactiveEffectiveFrom: '2026-07-01',
        priorWeeks: [{ weekEnding: '2026-08-29', status: 'submitted' }],
      },
    }),
    quiet: 'there is no correction',
    unless: clean({ context: { today: '2026-09-15' } }),
  },
  {
    code: 'RATE_CHANGE_MIDWEEK',
    fires: 'a new rate starts in the middle of the week',
    input: clean({
      classifications: [
        classification({ effectiveTo: '2026-09-09' }),
        classification({
          id: 'pc-2',
          effectiveFrom: '2026-09-10',
          wdBaseRate: '17.00',
          paidBaseRate: '17.00',
        }),
      ],
    }),
    quiet: 'one rate covers the whole week',
    unless: clean(),
  },
  {
    code: 'WEIGHTED_AVERAGE_USED',
    fires: 'a worker holds two classifications in one week',
    input: week({
      classifications: [
        classification(),
        classification({
          id: 'pc-2',
          classificationId: 'cls-2',
          displayLabel: 'Laborer – Group 1',
          officialLabel: 'Laborer – Group 1',
          wdBaseRate: '20.00',
          paidBaseRate: '20.00',
        }),
      ],
      entries: [
        ...entries([null, '8', '8', null, null, null, null]),
        ...entries([null, null, null, '8', null, null, null], { classificationId: 'cls-2' }),
      ],
    }),
    quiet: 'the worker holds one classification',
    unless: clean(),
  },

  // 3.3 Apprentices
  {
    code: 'APPRENTICE_NO_RECORD',
    fires: 'an apprentice has no registered programme',
    input: clean({ workers: [worker({ level: 'RA', apprentice: null })] }),
    quiet: 'the programme is on file',
    unless: clean({ workers: [worker({ level: 'RA', apprentice: apprentice() })] }),
  },
  {
    code: 'APPRENTICE_RECORD_EXPIRED',
    fires: 'the registration ran out before this week',
    input: clean({
      workers: [worker({ level: 'RA', apprentice: apprentice({ validTo: '2026-08-01' }) })],
    }),
    quiet: 'the registration is open ended',
    unless: clean({ workers: [worker({ level: 'RA', apprentice: apprentice() })] }),
  },
  {
    code: 'APPRENTICE_RATIO',
    fires: 'two apprentices work next to one journeyworker on a 1:3 ratio',
    input: week({
      classifications: [classification({ apprenticeRatio: '1:3' })],
      workers: [
        worker(),
        worker({
          id: 'w-2',
          lastName: 'Okafor',
          ssnLast4: '7731',
          level: 'RA',
          apprentice: apprentice(),
        }),
        worker({
          id: 'w-3',
          lastName: 'Nguyen',
          ssnLast4: '3309',
          level: 'RA',
          apprentice: apprentice(),
        }),
      ],
      entries: [
        ...entries([null, '8', null, null, null, null, null]),
        ...entries([null, '8', null, null, null, null, null], { workerId: 'w-2' }),
        ...entries([null, '8', null, null, null, null, null], { workerId: 'w-3' }),
      ],
    }),
    quiet: 'one apprentice works next to one journeyworker on a 1:1 ratio',
    unless: week({
      classifications: [classification({ apprenticeRatio: '1:1' })],
      workers: [
        worker(),
        worker({
          id: 'w-2',
          lastName: 'Okafor',
          ssnLast4: '7731',
          level: 'RA',
          apprentice: apprentice(),
        }),
      ],
      entries: [
        ...entries([null, '8', null, null, null, null, null]),
        ...entries([null, '8', null, null, null, null, null], { workerId: 'w-2' }),
      ],
    }),
  },
  {
    code: 'APPRENTICE_PCT_MISMATCH',
    fires: 'the rate paid is not the percentage of the programme',
    input: week({
      workers: [worker({ level: 'RA', apprentice: apprentice() })],
      entries: entries(FIVE_DAYS, { paidStRate: '10.00' }),
    }),
    quiet: 'the rate paid is 55 percent of the journeyworker rate',
    unless: week({
      workers: [worker({ level: 'RA', apprentice: apprentice() })],
      entries: entries(FIVE_DAYS, { paidStRate: '8.80' }),
    }),
  },

  // 3.4 Deductions and net pay
  {
    code: 'NET_MISMATCH',
    fires: 'gross minus deductions is not the net pay',
    input: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1850.00',
          netPay: '1400.00',
          deductions: [{ kind: 'federal_tax', amount: '412.30' }],
        },
      ],
    }),
    quiet: 'the three numbers agree',
    unless: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1850.00',
          netPay: '1437.70',
          deductions: [{ kind: 'federal_tax', amount: '412.30' }],
        },
      ],
    }),
  },
  {
    code: 'GROSS_ALL_BELOW_PROJECT',
    fires: 'the gross for all work is below this project alone',
    input: clean({
      payroll: [{ workerId: 'w-1', grossAllWork: '10.00', netPay: '10.00', deductions: [] }],
    }),
    quiet: 'the gross for all work is the larger number',
    unless: clean({
      payroll: [{ workerId: 'w-1', grossAllWork: '1000.00', netPay: '1000.00', deductions: [] }],
    }),
  },
  {
    code: 'GROSS_ALL_MISSING',
    fires: 'there are deductions but no gross for all work',
    input: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: null,
          netPay: null,
          deductions: [{ kind: 'federal_tax', amount: '10.00' }],
        },
      ],
    }),
    quiet: 'the gross for all work is entered',
    unless: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1000.00',
          netPay: '990.00',
          deductions: [{ kind: 'federal_tax', amount: '10.00' }],
        },
      ],
    }),
  },
  {
    code: 'DEDUCTIONS_OVER_10',
    fires: 'a worker has eleven deductions',
    input: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1000.00',
          netPay: '989.00',
          deductions: deductions(11),
        },
      ],
    }),
    quiet: 'a worker has exactly ten',
    unless: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1000.00',
          netPay: '990.00',
          deductions: deductions(10),
        },
      ],
    }),
  },
  {
    code: 'DEDUCTION_UNKNOWN_KIND',
    fires: 'an other deduction has no description',
    input: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1000.00',
          netPay: '990.00',
          deductions: [{ kind: 'other', label: null, amount: '10.00' }],
        },
      ],
    }),
    quiet: 'the description is there',
    unless: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1000.00',
          netPay: '990.00',
          deductions: [{ kind: 'other', label: 'Tools', amount: '10.00' }],
        },
      ],
    }),
  },
  {
    code: 'DEDUCTION_NEGATIVE',
    fires: 'a deduction is negative',
    input: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1000.00',
          netPay: '1005.00',
          deductions: [{ kind: 'other', label: 'Refund', amount: '-5.00' }],
        },
      ],
    }),
    quiet: 'the deduction is positive',
    unless: clean({
      payroll: [
        {
          workerId: 'w-1',
          grossAllWork: '1000.00',
          netPay: '995.00',
          deductions: [{ kind: 'other', label: 'Tools', amount: '5.00' }],
        },
      ],
    }),
  },

  // 3.5 Worker and PII
  {
    code: 'WORKER_ID_MISSING',
    fires: 'the worker has neither the last 4 of the SSN nor a date of birth',
    input: clean({ workers: [worker({ ssnLast4: null, dateOfBirth: null })] }),
    quiet: 'the last 4 are there',
    unless: clean(),
  },
  {
    code: 'SSN4_AND_DOB',
    fires: 'the worker has both',
    input: clean({ workers: [worker({ dateOfBirth: '1988-05-14' })] }),
    quiet: 'the worker has one of them',
    unless: clean(),
  },
  {
    code: 'WORKER_ADDRESS_MISSING',
    fires: 'the worker has no address',
    input: clean({ workers: [worker({ address: null })] }),
    quiet: 'the address is there',
    unless: clean(),
  },
  {
    code: 'WORKER_ADDRESS_TOO_LONG',
    fires: 'the first address line is 43 characters',
    input: clean({
      workers: [
        worker({
          address: {
            address1: '1234 Extraordinarily Long Boulevard Street1',
            city: 'Poughkeepsie',
            state: 'NY',
            postalCode: '12601',
          },
        }),
      ],
    }),
    quiet: 'it is exactly 42',
    unless: clean({
      workers: [
        worker({
          address: {
            address1: '1234 Extraordinarily Long Boulevard Street',
            city: 'Poughkeepsie',
            state: 'NY',
            postalCode: '12601',
          },
        }),
      ],
    }),
  },
  {
    code: 'WORKER_ZIP_FORMAT',
    fires: 'the ZIP has four digits',
    input: clean({
      workers: [
        worker({
          address: {
            address1: '1 Main Street',
            city: 'Poughkeepsie',
            state: 'NY',
            postalCode: '1260',
          },
        }),
      ],
    }),
    quiet: 'the ZIP has five',
    unless: clean(),
  },
  {
    code: 'WORKER_NAME_SUSPICIOUS',
    fires: 'the last name is a single letter',
    input: clean({ workers: [worker({ lastName: 'D' })] }),
    quiet: 'the name is a full name',
    unless: clean(),
  },
  {
    code: 'WORKER_DUPLICATE',
    fires: 'two active workers share a name and the last 4 of the SSN',
    input: clean({ workers: [worker(), worker({ id: 'w-2' })] }),
    quiet: 'the last 4 differ',
    unless: clean({ workers: [worker(), worker({ id: 'w-2', ssnLast4: '9999' })] }),
  },

  // 3.6 Project and period
  {
    code: 'PRC_MISSING',
    fires: 'a NY project has no PRC number',
    input: clean({ project: project({ prcNumber: null }) }),
    quiet: 'the PRC number is entered',
    unless: clean(),
  },
  {
    code: 'WD_MISSING',
    fires: 'a federal project has no wage determination number',
    input: clean({ project: project({ federalReporting: true, federalWdNumber: null }) }),
    quiet: 'the WD number is entered',
    unless: clean({ project: project({ federalReporting: true, federalWdNumber: 'NY20260014' }) }),
  },
  {
    code: 'CLASSIFICATION_NOT_OFFICIAL',
    fires: 'the label is not in the official list',
    input: clean({ context: { catalogLabels: ['Laborer – Group 1'] } }),
    quiet: 'the label is in the list',
    unless: clean({ context: { catalogLabels: ['Electrician – Inside Wireman'] } }),
  },
  {
    code: 'PAYROLL_GAP',
    fires: 'a week between two filed weeks has no report',
    input: clean({
      context: {
        today: '2026-09-15',
        priorWeeks: [
          { weekEnding: '2026-08-29', status: 'submitted' },
          { weekEnding: '2026-09-05', status: null },
        ],
      },
    }),
    quiet: 'every earlier week has a report',
    unless: clean({
      context: {
        today: '2026-09-15',
        priorWeeks: [
          { weekEnding: '2026-08-29', status: 'submitted' },
          { weekEnding: '2026-09-05', status: 'submitted' },
        ],
      },
    }),
  },
  {
    code: 'PERIOD_LOCKED',
    fires: 'a signed week is edited',
    input: clean({ period: period({ lockedAt: '2026-09-14T18:30:00Z' }), intent: 'edit' }),
    quiet: 'the signed week is only being read',
    unless: clean({ period: period({ lockedAt: '2026-09-14T18:30:00Z' }), intent: 'review' }),
  },
  {
    code: 'FINAL_ALREADY_SET',
    fires: 'a week comes after the final report',
    input: clean({ project: project({ finalWeekEnding: '2026-08-29' }) }),
    quiet: 'the project has no final report',
    unless: clean(),
  },
  {
    code: 'PROJECT_NOT_ACTIVE',
    fires: 'hours are entered on a paused project',
    input: clean({ project: project({ status: 'paused' }) }),
    quiet: 'the project is active',
    unless: clean(),
  },
  {
    code: 'OVER_500_WORKERS',
    fires: 'the week holds 501 workers',
    input: crowd(501),
    quiet: 'the week holds 500',
    unless: crowd(500),
  },

  // 3.7 Notices
  {
    code: 'STATE_DEADLINE_T10',
    fires: 'the NY deadline is ten days away',
    input: clean({ project: project(DEADLINE), context: { today: '2026-09-15' } }),
    quiet: 'it is eleven days away',
    unless: clean({ project: project(DEADLINE), context: { today: '2026-09-14' } }),
  },
  {
    code: 'STATE_DEADLINE_T5',
    fires: 'the NY deadline is five days away',
    input: clean({ project: project(DEADLINE), context: { today: '2026-09-20' } }),
    quiet: 'it is ten days away',
    unless: clean({ project: project(DEADLINE), context: { today: '2026-09-15' } }),
  },
  {
    code: 'STATE_DEADLINE_T2',
    fires: 'the NY deadline is two days away',
    input: clean({ project: project(DEADLINE), context: { today: '2026-09-23' } }),
    quiet: 'it is five days away',
    unless: clean({ project: project(DEADLINE), context: { today: '2026-09-20' } }),
  },
  {
    code: 'STATE_DEADLINE_T0',
    fires: 'the NY deadline is today',
    input: clean({ project: project(DEADLINE), context: { today: '2026-09-25' } }),
    quiet: 'it is two days away',
    unless: clean({ project: project(DEADLINE), context: { today: '2026-09-23' } }),
  },
  {
    code: 'STATE_DEADLINE_PENALTY',
    fires: 'the deadline is 15 days past, beyond the grace period',
    input: clean({ project: project(DEADLINE), context: { today: '2026-10-10' } }),
    quiet: 'it is 13 days past and still inside the grace period',
    unless: clean({ project: project(DEADLINE), context: { today: '2026-10-08' } }),
  },
  {
    code: 'FEDERAL_DUE_T2',
    fires: 'the WH-347 is due in two days',
    input: clean({
      project: project({ federalReporting: true, federalWdNumber: 'NY1', ...DEADLINE }),
      context: { today: '2026-09-18', payDate: '2026-09-13' },
    }),
    quiet: 'it is five days away',
    unless: clean({
      project: project({ federalReporting: true, federalWdNumber: 'NY1', ...DEADLINE }),
      context: { today: '2026-09-15', payDate: '2026-09-13' },
    }),
  },
  {
    code: 'NO_WORK_WEEK_PORTAL',
    fires: 'the week is a no work week',
    input: week({ period: period({ isNoWork: true }) }),
    quiet: 'the week has work',
    unless: clean(),
  },
  {
    code: 'REMINDER_DUE',
    fires: 'it is Monday and the week is still open',
    input: clean({ project: project(DEADLINE), context: { today: '2026-09-14' } }),
    quiet: 'it is Tuesday',
    unless: clean({ project: project(DEADLINE), context: { today: '2026-09-15' } }),
  },
  {
    code: 'RATE_UPDATE_AVAILABLE',
    fires: 'the wage schedule holds newer rates',
    input: clean({
      project: project(DEADLINE),
      context: { today: '2026-09-15', wageScheduleUpdatedAt: '2026-09-01' },
    }),
    quiet: 'the schedule is older than the rates on the project',
    unless: clean({
      project: project(DEADLINE),
      context: { today: '2026-09-15', wageScheduleUpdatedAt: '2026-06-01' },
    }),
  },
  {
    code: 'RETENTION_APPROACHING',
    fires: 'the oldest report is five years and nine months old',
    input: clean({
      project: project(DEADLINE),
      context: { today: '2026-09-15', oldestReportWeekEnding: '2020-01-04' },
    }),
    quiet: 'the oldest report is from last year',
    unless: clean({
      project: project(DEADLINE),
      context: { today: '2026-09-15', oldestReportWeekEnding: '2025-01-04' },
    }),
  },
]

describe('the catalogue', () => {
  it('holds the 63 codes of spec/07 §3', () => {
    expect(FINDING_CODES).toHaveLength(63)
  })

  it('has a case here for every one of them', () => {
    expect([...CASES.map((item) => item.code)].sort()).toEqual([...FINDING_CODES].sort())
  })

  it('offers a repair only where the repair is unambiguous (spec/19 §3)', () => {
    expect(AUTO_FIXABLE).toEqual(['DAY_OVER_24', 'RATE_EXPIRED'])
  })

  it('never lets a hard finding out without a suggested fix (spec/07 §5)', () => {
    for (const item of CASES) {
      const finding = findingOf(item.input, item.code)
      if (finding?.severity === 'hard') {
        expect(`${item.code}: ${finding.suggestedFix ?? ''}`).not.toBe(`${item.code}: `)
      }
    }
  })

  it('carries the severity spec/07 §3 gives each code', () => {
    for (const item of CASES) {
      const finding = findingOf(item.input, item.code)
      const catalogue = FINDINGS[item.code].severity
      // DEDUCTIONS_OVER_10 and SSN4_AND_DOB are lifted or lowered by a setting.
      if (item.code === 'DEDUCTIONS_OVER_10' || item.code === 'SSN4_AND_DOB') continue
      expect(`${item.code}=${finding?.severity}`).toBe(`${item.code}=${catalogue}`)
    }
  })
})

describe('a week with nothing wrong', () => {
  it('produces no findings at all', () => {
    expect(computeWeek(clean()).findings).toEqual([])
  })
})

for (const item of CASES) {
  describe(item.code, () => {
    it(`fires when ${item.fires}`, () => {
      expect(codesOf(item.input)).toContain(item.code)
    })

    it(`stays quiet when ${item.quiet}`, () => {
      expect(codesOf(item.unless)).not.toContain(item.code)
    })
  })
}

describe('severities a tenant setting moves', () => {
  it('makes SSN4_AND_DOB hard under strict PII (spec/07 §3.5)', () => {
    const relaxed = clean({ workers: [worker({ dateOfBirth: '1988-05-14' })] })
    const strict = clean({
      tenant: { strictPii: true },
      workers: [worker({ dateOfBirth: '1988-05-14' })],
    })
    expect(findingOf(relaxed, 'SSN4_AND_DOB')?.severity).toBe('info')
    expect(findingOf(strict, 'SSN4_AND_DOB')?.severity).toBe('hard')
  })

  it('makes DEDUCTIONS_OVER_10 hard when merging is off (spec/07 §3.4)', () => {
    const payroll = [
      {
        workerId: 'w-1',
        grossAllWork: '1000.00',
        netPay: '989.00',
        deductions: deductions(11),
      },
    ]
    expect(findingOf(clean({ payroll }), 'DEDUCTIONS_OVER_10')?.severity).toBe('soft')
    expect(
      findingOf(clean({ tenant: { mergeDeductions: false }, payroll }), 'DEDUCTIONS_OVER_10')
        ?.severity,
    ).toBe('hard')
  })
})

describe('the panel reads the list in order (spec/07 §4)', () => {
  it('puts hard first, then soft, then info', () => {
    const findings = computeWeek(
      clean({
        workers: [worker({ address: null, dateOfBirth: '1988-05-14' })],
        entries: entries([null, '17', null, null, null, null, null], {}),
      }),
    ).findings
    const order = findings.map((finding) => finding.severity)
    expect(order).toEqual([...order].sort((a, b) => rank(a) - rank(b)))
    expect(order).toContain('hard')
    expect(order).toContain('soft')
  })
})

function rank(severity: string): number {
  return severity === 'hard' ? 0 : severity === 'soft' ? 1 : 2
}
