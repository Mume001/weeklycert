// Every finding of spec/07 §3, decided here and nowhere else.
//
// The message is written in this file because the UI must never compose one
// (spec/07 §1, CLAUDE.md). Every hard finding carries a suggestedFix, without
// exception (spec/07 §5), and a test checks that it does.
import { addDays, addMonths, dayOfWeek, daysBetween, shortDate } from '../dates.ts'
import { parseRatio, ratioExceeded, recordCovers } from '../engine/apprentice.ts'
import type { CellModel, RowModel, WeekModel, WorkerModel } from '../engine/model.ts'
import { makeupCodes, weekendCodes } from '../engine/ot-codes.ts'
import type { Finding } from '../engine/types.ts'
import { type Dec, dec, equalWithinCent, hours, money, ZERO } from '../money.ts'
import { FINDINGS, type FindingCode, type Severity } from './codes.ts'

/** The NY filing interval: every 30 days from the start or the last acceptance. */
const STATE_INTERVAL_DAYS = 30
/** After 14 days over the deadline a penalty of $100 a day becomes possible. */
const STATE_GRACE_DAYS = 14
/** Federal: 7 days from the pay date (29 CFR 3.4(a)); warn 2 days before. */
const FEDERAL_DUE_DAYS = 7
const MAX_WORKERS_PER_FILE = 500
const MAX_DEDUCTIONS = 10
const MONDAY = 1

interface Options {
  severity?: Severity
  detail?: string
  suggestedFix?: string
  workerId?: string
  workDate?: string
  classificationId?: string
  field?: string
}

function make(code: FindingCode, message: string, options: Options = {}): Finding {
  const entry = FINDINGS[code]
  const finding: Finding = {
    code,
    severity: options.severity ?? entry.severity,
    message,
  }
  if (options.detail) finding.detail = options.detail
  if (options.suggestedFix) finding.suggestedFix = options.suggestedFix
  if (options.workerId) finding.workerId = options.workerId
  if (options.workDate) finding.workDate = options.workDate
  if (options.classificationId) finding.classificationId = options.classificationId
  if (options.field) finding.field = options.field
  if ('rule' in entry && entry.rule) finding.rule = entry.rule
  return finding
}

function name(worker: { firstName: string; lastName: string }): string {
  return `${worker.firstName} ${worker.lastName}`
}

function label(row: RowModel, model: WeekModel): string {
  if (row.classification) return row.classification.displayLabel
  const any = model.input.classifications.find(
    (item) => item.classificationId === row.classificationId,
  )
  return any?.displayLabel ?? row.classificationId
}

const SEVERITY_ORDER: Record<Severity, number> = { hard: 0, soft: 1, info: 2 }

export function validateWeek(model: WeekModel): Finding[] {
  const findings: Finding[] = [
    ...periodFindings(model),
    ...projectFindings(model),
    ...workerFindings(model),
    ...rowFindings(model),
    ...cellFindings(model),
    ...dayFindings(model),
    ...notices(model),
  ]
  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

// ---------------------------------------------------------------------------
// The period as a whole
// ---------------------------------------------------------------------------

function periodFindings(model: WeekModel): Finding[] {
  const { period, project, intent } = model.input
  const out: Finding[] = []
  const hasHours = model.input.entries.length > 0

  if (!hasHours && !period.isNoWork) {
    out.push(
      make('NO_HOURS_NOT_MARKED', 'No hours have been entered for this week.', {
        suggestedFix: 'If nobody worked on this project, mark the week as a no work week.',
      }),
    )
  }
  if (period.isNoWork && hasHours) {
    out.push(
      make('NO_WORK_WITH_HOURS', 'This week is marked as a no work week but it has hours.', {
        suggestedFix: 'Remove the hours, or clear the no work week mark.',
      }),
    )
  }
  if (period.lockedAt !== null && intent === 'edit') {
    out.push(
      make('PERIOD_LOCKED', 'This week is signed and its hours can no longer be changed.', {
        detail: `Signed on ${shortDate(period.lockedAt.slice(0, 10))}.`,
        suggestedFix: 'Create a correction; it copies the hours into a new week.',
      }),
    )
  }
  if (project.finalWeekEnding !== null && period.weekEnding > project.finalWeekEnding) {
    out.push(
      make('FINAL_ALREADY_SET', 'This project was already marked finished.', {
        detail: `The final report covers the week ending ${shortDate(project.finalWeekEnding)}.`,
        suggestedFix: 'If there is more work, undo the final mark on that week first.',
      }),
    )
  }
  if (project.status === 'paused' && hasHours) {
    out.push(
      make('PROJECT_NOT_ACTIVE', 'Hours were entered on a project that is paused.', {
        suggestedFix: 'Set the project back to active if work has restarted.',
      }),
    )
  }
  for (const entry of model.outsideWeek) {
    out.push(
      make('DATE_OUTSIDE_WEEK', `${shortDate(entry.workDate)} is outside this payroll week.`, {
        workerId: entry.workerId,
        workDate: entry.workDate,
        suggestedFix: 'Move the hours into the right week.',
      }),
    )
  }
  return out
}

function projectFindings(model: WeekModel): Finding[] {
  const { project } = model.input
  const out: Finding[] = []

  if (project.nyReporting && !project.prcNumber) {
    out.push(
      make('PRC_MISSING', 'This project has no PRC number.', {
        detail: 'The NY portal files every report under the PRC number of the project.',
        suggestedFix: 'Add the PRC number in the project settings.',
      }),
    )
  }
  if (project.federalReporting && !project.federalWdNumber) {
    out.push(
      make('WD_MISSING', 'No federal wage determination number was entered.', {
        suggestedFix: 'Add the WD number, otherwise the form goes out with the field empty.',
      }),
    )
  }
  const withHours = model.workers.length
  if (project.nyReporting && withHours > MAX_WORKERS_PER_FILE) {
    out.push(
      make('OVER_500_WORKERS', `This week has ${withHours} workers; one file holds 500.`, {
        suggestedFix: 'Split the work into two projects, or file the extra workers separately.',
      }),
    )
  }
  const labels = model.input.context.catalogLabels
  if (labels) {
    const seen = new Set<string>()
    for (const row of model.rows) {
      const official = row.classification?.officialLabel
      if (!official || seen.has(official) || labels.includes(official)) continue
      seen.add(official)
      out.push(
        make('CLASSIFICATION_NOT_OFFICIAL', `"${official}" is not in the official NY list.`, {
          classificationId: row.classificationId,
          detail: 'The portal only accepts a classification exactly as it is spelled in its list.',
          suggestedFix: 'Pick the classification again from the list.',
        }),
      )
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

function workerFindings(model: WeekModel): Finding[] {
  const { project, tenant } = model.input
  const out: Finding[] = []
  const seenWorkerPlan = new Set<string>()
  const seenPlan = new Set<string>()

  for (const entry of model.workers) {
    const worker = entry.worker
    const who = name(worker)

    if (worker.status === 'inactive') {
      out.push(
        make('WORKER_INACTIVE', `${who} is marked inactive but has hours this week.`, {
          workerId: worker.id,
          suggestedFix: 'Set the worker back to active, or move the hours to somebody else.',
        }),
      )
    }
    if (/\d/.test(worker.firstName + worker.lastName) || worker.lastName.trim().length < 2) {
      out.push(
        make('WORKER_NAME_SUSPICIOUS', `"${who}" does not look like a full name.`, {
          workerId: worker.id,
          suggestedFix: 'The report needs the first and last name as they are on the payroll.',
        }),
      )
    }
    if (project.nyReporting) {
      out.push(...piiFindings(entry, tenant.strictPii))
    }
    out.push(...payrollFindings(entry, model))
    if (project.federalReporting && tenant.federalOtEnabled && entry.stHours.gt(40)) {
      out.push(
        make(
          'OT_FEDERAL_UNDERCOUNT',
          `${who} has ${hours(entry.stHours)} straight time hours; the week holds 40.`,
          {
            workerId: worker.id,
            detail: 'Everything over 40 hours a week on covered work is overtime.',
            suggestedFix: 'Let the engine split the hours, or correct the split you typed.',
          },
        ),
      )
    }
    if (entry.regularRateMethod === 'weighted_average' && tenant.federalOtEnabled) {
      out.push(
        make(
          'WEIGHTED_AVERAGE_USED',
          `Overtime for ${who} uses the weighted average rate ${money(entry.regularRate)}.`,
          {
            workerId: worker.id,
            detail: 'The worker held more than one classification this week.',
          },
        ),
      )
    }
    out.push(...planFindings(entry, model, seenWorkerPlan, seenPlan))
  }

  out.push(...duplicateWorkers(model))
  return out
}

function piiFindings(entry: WorkerModel, strictPii: boolean): Finding[] {
  const worker = entry.worker
  const who = name(worker)
  const out: Finding[] = []

  if (!worker.ssnLast4 && !worker.dateOfBirth) {
    out.push(
      make(
        'WORKER_ID_MISSING',
        `The portal needs the last 4 of the SSN or a date of birth for ${who}.`,
        {
          workerId: worker.id,
          field: 'ssnLast4',
          suggestedFix: 'Add either one on the worker. A full SSN is never needed.',
        },
      ),
    )
  }
  if (worker.ssnLast4 && worker.dateOfBirth) {
    out.push(
      make('SSN4_AND_DOB', `${who} has both the last 4 of the SSN and a date of birth.`, {
        severity: strictPii ? 'hard' : 'info',
        workerId: worker.id,
        field: 'ssnLast4',
        detail: 'The file carries exactly one of them; the engine sends the last 4 of the SSN.',
        suggestedFix: 'Remove the date of birth if the portal should not receive it.',
      }),
    )
  }
  const address = worker.address
  if (!address) {
    out.push(
      make('WORKER_ADDRESS_MISSING', `${who} has no address; the NY file needs one.`, {
        workerId: worker.id,
        field: 'address1',
        suggestedFix: 'Add the home address on the worker.',
      }),
    )
    return out
  }
  const tooLong: string[] = []
  if (address.address1.length > 42) tooLong.push(`address line 1 has ${address.address1.length}`)
  if ((address.address2?.length ?? 0) > 42) tooLong.push('address line 2 is over 42')
  if (address.city.length > 40) tooLong.push(`the city has ${address.city.length}`)
  if (address.state.length > 50) tooLong.push('the state is over 50')
  if (tooLong.length > 0) {
    out.push(
      make('WORKER_ADDRESS_TOO_LONG', `The address of ${who} is longer than the portal accepts.`, {
        workerId: worker.id,
        field: 'address1',
        detail: `Address line 1 holds 42 characters, the city 40; ${tooLong.join(', ')}.`,
        suggestedFix: 'Shorten the address to the limits above.',
      }),
    )
  }
  const zipOk = /^\d{5}$/.test(address.postalCode)
  const extOk = address.postalCodeExt === null || /^\d{4}$/.test(address.postalCodeExt)
  if (!zipOk || !extOk) {
    out.push(
      make('WORKER_ZIP_FORMAT', `The ZIP code of ${who} is not in the format the portal needs.`, {
        workerId: worker.id,
        field: 'postalCode',
        detail: 'The ZIP is 5 digits and the extension, when there is one, is 4 digits.',
        suggestedFix: 'Correct the ZIP code on the worker.',
      }),
    )
  }
  return out
}

function duplicateWorkers(model: WeekModel): Finding[] {
  const seen = new Map<string, string>()
  const out: Finding[] = []
  for (const worker of model.input.workers) {
    if (worker.status !== 'active' || !worker.ssnLast4) continue
    const key = `${worker.firstName}|${worker.lastName}|${worker.ssnLast4}`
    const first = seen.get(key)
    if (first) {
      out.push(
        make('WORKER_DUPLICATE', `${name(worker)} appears twice with the same last 4 of the SSN.`, {
          workerId: worker.id,
          suggestedFix: 'Merge the two records, or correct the one that is wrong.',
        }),
      )
    } else {
      seen.set(key, worker.id)
    }
  }
  return out
}

/**
 * Findings about the benefit plans themselves. They belong to the worker and
 * the plan, not to a classification, so they still fire when the rate of the
 * row has expired. That is how the fixture week of spec/19 §4 gets its third
 * soft finding: the only worker on the annuity fund is the one whose Ironworker
 * rates ran out on 30 June.
 */
function planFindings(
  entry: WorkerModel,
  model: WeekModel,
  seenWorkerPlan: Set<string>,
  seenPlan: Set<string>,
): Finding[] {
  const out: Finding[] = []
  const who = name(entry.worker)
  for (const row of entry.rows) {
    for (const credit of row.credits) {
      const key = `${entry.worker.id}|${credit.planId}`
      if (seenWorkerPlan.has(key)) continue
      seenWorkerPlan.add(key)
      if (credit.legallyRequired) {
        out.push(
          make(
            'FRINGE_LEGALLY_REQUIRED',
            `"${credit.name}" cannot be counted as a benefit for ${who}.`,
            {
              workerId: entry.worker.id,
              detail: 'FICA, workers compensation and unemployment insurance are required by law.',
              suggestedFix: 'Remove the plan from the benefits of this worker.',
            },
          ),
        )
      }
      if (credit.missingAnnualBasis && !seenPlan.has(credit.planId)) {
        seenPlan.add(credit.planId)
        out.push(
          make('FRINGE_NOT_ANNUALIZED', `"${credit.name}" has a yearly cost but no yearly hours.`, {
            workerId: entry.worker.id,
            detail: `The engine used the ${hours(model.input.tenant.annualHoursBasis)} hour default, which counts public and private work alike.`,
            suggestedFix: 'Enter the hours the plan is spread over so the credit is right.',
          }),
        )
      }
    }
  }
  return out
}

function payrollFindings(entry: WorkerModel, model: WeekModel): Finding[] {
  const payroll = entry.payroll
  const out: Finding[] = []
  if (!payroll) return out
  const who = name(entry.worker)
  const hasPayrollData = payroll.deductions.length > 0 || payroll.netPay !== null

  if (hasPayrollData && payroll.grossAllWork === null) {
    out.push(
      make('GROSS_ALL_MISSING', `Gross for all work is missing for ${who}.`, {
        workerId: entry.worker.id,
        detail: 'The gross from this project is used instead.',
        suggestedFix: 'If the worker also worked elsewhere, import or enter the full gross.',
      }),
    )
  }
  if (payroll.grossAllWork !== null && dec(payroll.grossAllWork).lt(entry.grossThisProject)) {
    out.push(
      make(
        'GROSS_ALL_BELOW_PROJECT',
        `Gross for all work (${money(payroll.grossAllWork)}) is below this project alone (${money(entry.grossThisProject)}).`,
        {
          workerId: entry.worker.id,
          suggestedFix: 'Enter the full weekly gross, including this project.',
        },
      ),
    )
  }
  if (payroll.netPay !== null) {
    const expected = entry.grossAllWork.minus(entry.deductionsTotal)
    if (!equalWithinCent(expected, dec(payroll.netPay))) {
      out.push(
        make(
          'NET_MISMATCH',
          `Gross ${money(entry.grossAllWork)} minus deductions ${money(entry.deductionsTotal)} is not ${money(payroll.netPay)}.`,
          {
            workerId: entry.worker.id,
            detail: `The difference is ${money(expected.minus(dec(payroll.netPay)).abs())}.`,
            suggestedFix: 'Check the deductions and the net pay against the payroll register.',
          },
        ),
      )
    }
  }
  for (const deduction of payroll.deductions) {
    if (dec(deduction.amount).lt(ZERO)) {
      out.push(
        make('DEDUCTION_NEGATIVE', `A deduction for ${who} is negative.`, {
          workerId: entry.worker.id,
          suggestedFix: 'A refund belongs in gross pay, not in a negative deduction.',
        }),
      )
    }
    if (deduction.kind === 'other' && !deduction.label) {
      out.push(
        make('DEDUCTION_UNKNOWN_KIND', `A deduction for ${who} has no description.`, {
          workerId: entry.worker.id,
          suggestedFix: 'Name the deduction; the portal shows the description as typed.',
        }),
      )
    }
  }
  if (model.input.project.nyReporting && payroll.deductions.length > MAX_DEDUCTIONS) {
    const merge = model.input.tenant.mergeDeductions
    out.push(
      make(
        'DEDUCTIONS_OVER_10',
        `${who} has ${payroll.deductions.length} deductions; the NY file holds 10.`,
        {
          severity: merge ? 'soft' : 'hard',
          workerId: entry.worker.id,
          detail: merge ? 'The smallest ones are merged into Other.' : undefined,
          suggestedFix: merge
            ? 'Check that the merged line is right.'
            : 'Turn on merging in the settings, or combine the deductions yourself.',
        },
      ),
    )
  }
  return out
}

// ---------------------------------------------------------------------------
// Rows: one worker in one classification
// ---------------------------------------------------------------------------

function rowFindings(model: WeekModel): Finding[] {
  const { project, tenant } = model.input
  const out: Finding[] = []
  const ratioReported = new Set<string>()
  const supplementReported = new Set<string>()

  for (const row of model.rows) {
    const who = name(row.worker)
    const what = label(row, model)
    const where = { workerId: row.worker.id, classificationId: row.classificationId }

    if (!row.classificationId) {
      out.push(
        make('WORKER_NO_CLASSIFICATION', `${who} has hours without a classification.`, {
          workerId: row.worker.id,
          suggestedFix: 'Pick the classification the worker actually worked in.',
        }),
      )
      continue
    }
    if (!row.onProject) {
      out.push(
        make('CLASSIFICATION_NOT_ON_PROJECT', `"${what}" has no rate on this project.`, {
          ...where,
          suggestedFix: 'Add the classification and its rates under Classifications.',
        }),
      )
      continue
    }
    if (row.rateExpired) {
      const last = model.input.classifications
        .filter((item) => item.classificationId === row.classificationId)
        .map((item) => item.effectiveTo)
        .filter((date): date is string => date !== null)
        .sort()
        .pop()
      out.push(
        make('RATE_EXPIRED', `The rates for "${what}" do not cover this week.`, {
          ...where,
          detail: last ? `They ran out on ${shortDate(last)}.` : undefined,
          suggestedFix: 'Enter the new rates from the wage schedule and their start date.',
        }),
      )
      continue
    }
    const classification = row.classification
    if (!classification) continue

    if (dec(classification.paidBaseRate).lt(classification.wdBaseRate)) {
      out.push(
        make(
          'RATE_BELOW_WD',
          `${money(classification.paidBaseRate)} is below the wage determination ${money(classification.wdBaseRate)} for "${what}".`,
          {
            ...where,
            suggestedFix: 'Raise the paid rate to at least the rate in the wage determination.',
          },
        ),
      )
    }
    if (project.nyReporting && classification.otCodes.length === 0) {
      out.push(
        make('OT_NY_CODE_MISSING', `No overtime code was entered for "${what}".`, {
          ...where,
          detail: 'Without it the engine cannot work out when overtime starts.',
          suggestedFix: 'Copy the codes from the OVERTIME PAGE of the wage schedule.',
        }),
      )
    }
    // A property of the classification, so it is said once and not per worker.
    if (row.supplementPremiumKind !== 'none' && !supplementReported.has(row.classificationId)) {
      supplementReported.add(row.classificationId)
      const code = row.supplementPremiumKind === 'one_and_a_half' ? 'W' : 'V'
      out.push(
        make(
          'OT_NY_SUPPLEMENT_PREMIUM',
          `Code ${code}: supplements for "${what}" carry a premium on overtime hours.`,
          { classificationId: row.classificationId },
        ),
      )
    }
    out.push(...fringeFindings(row, where, who, what))
    out.push(...apprenticeFindings(row, model, where, who, what))
    out.push(...rateFindings(row, where, what, tenant.federalOtEnabled))

    const versions = new Set(row.cells.map((cell) => cell.classification?.id ?? ''))
    if (versions.size > 1) {
      out.push(
        make('RATE_CHANGE_MIDWEEK', `The rate for "${what}" changes inside this week.`, {
          ...where,
          detail: 'The engine pays every day at the rate in force on that day.',
        }),
      )
    }
    if (row.apprenticeApplied && classification.apprenticeRatio === null) {
      if (!ratioReported.has(row.classificationId)) {
        ratioReported.add(row.classificationId)
        out.push(
          make('APPRENTICE_RATIO', `No apprentice ratio is on file for "${what}".`, {
            severity: 'info',
            ...where,
            detail: 'Without it the engine cannot check how many apprentices the crew may carry.',
            suggestedFix: 'Enter the ratio from the apprenticeship programme, for example 1:3.',
          }),
        )
      }
    }
  }
  out.push(...ratioFindings(model))
  return out
}

function fringeFindings(
  row: RowModel,
  where: { workerId: string; classificationId: string },
  who: string,
  what: string,
): Finding[] {
  const out: Finding[] = []
  if (row.fringe.shortfallHourly.gt(ZERO)) {
    const weekly = row.fringe.shortfallHourly.times(row.totalHours)
    out.push(
      make(
        'FRINGE_SHORTFALL',
        `Benefits: the determination asks ${money(row.fringe.requiredHourly)} an hour and ${money(row.fringe.creditHourly.plus(row.fringe.cashHourly))} is provided.`,
        {
          ...where,
          detail: `${money(row.fringe.shortfallHourly)} an hour is missing, about ${money(weekly)} this week.`,
          suggestedFix: 'Pay the difference in cash, or raise the contribution to the plan.',
        },
      ),
    )
  }
  if (row.fringe.status === 'missing' && row.fringe.requiredHourly.gt(ZERO)) {
    out.push(
      make('FRINGE_NO_ALLOCATION', `It is not set how ${who} is paid benefits for "${what}".`, {
        ...where,
        detail: 'Cash is assumed until a plan is assigned.',
        suggestedFix: 'Assign a plan to the worker, or record the cash paid in lieu.',
      }),
    )
  }
  return out
}

function apprenticeFindings(
  row: RowModel,
  model: WeekModel,
  where: { workerId: string; classificationId: string },
  who: string,
  what: string,
): Finding[] {
  const out: Finding[] = []
  if (row.worker.level !== 'RA') return out
  const record = row.worker.apprentice
  const firstDay = row.cells[0]?.entry.workDate ?? model.input.period.weekEnding

  if (!record) {
    out.push(
      make(
        'APPRENTICE_NO_RECORD',
        `${who} is marked as an apprentice with no registered programme.`,
        {
          ...where,
          detail: 'Without registration the full journeyworker rate is owed.',
          suggestedFix:
            'Add the programme and its registration, or change the level to journeyworker.',
        },
      ),
    )
    return out
  }
  if (!row.cells.every((cell) => recordCovers(record, cell.entry.workDate))) {
    out.push(
      make('APPRENTICE_RECORD_EXPIRED', `The apprenticeship of ${who} does not cover this week.`, {
        ...where,
        workDate: firstDay,
        detail: record.validTo ? `It ran out on ${shortDate(record.validTo)}.` : undefined,
        suggestedFix: 'Renew the registration, or pay the full journeyworker rate.',
      }),
    )
  }
  if (row.paidStRate && row.expectedApprenticeRate) {
    if (!equalWithinCent(row.paidStRate, row.expectedApprenticeRate)) {
      out.push(
        make(
          'APPRENTICE_PCT_MISMATCH',
          `${who} is paid ${money(row.paidStRate)} an hour; period ${record.periodNo} of the programme is ${money(row.expectedApprenticeRate)}.`,
          {
            ...where,
            detail: `That is ${money(record.pctOfJourney)} percent of the journeyworker rate for "${what}".`,
            suggestedFix: 'Correct the rate, or the period of the programme on the worker.',
          },
        ),
      )
    }
  }
  return out
}

function rateFindings(
  row: RowModel,
  where: { workerId: string; classificationId: string },
  what: string,
  federalOtEnabled: boolean,
): Finding[] {
  const out: Finding[] = []
  const reported = row.cells
    .map((cell) => cell.entry.paidOtRate)
    .find((value): value is string => value !== null && value !== undefined)
  if (!reported || row.otHours.lte(ZERO)) return out

  const paid = dec(reported)
  const required = row.otRate
  if (paid.lt(required) && !equalWithinCent(paid, required)) {
    out.push(
      make(
        'OT_RATE_BELOW_1_5',
        `The overtime rate ${money(paid)} for "${what}" is below the ${money(required)} that is owed.`,
        {
          ...where,
          detail: federalOtEnabled
            ? 'Overtime is at least 1.5 times the base rate, and more where the NY code says so.'
            : 'The NY overtime code of this classification asks for more.',
          suggestedFix: 'Correct the overtime rate in the payroll and import the week again.',
        },
      ),
    )
  }
  const withFringe = row.rate.plus(row.paidSupplementHourly).times(dec('1.5'))
  if (equalWithinCent(paid, withFringe) && row.paidSupplementHourly.gt(ZERO)) {
    out.push(
      make(
        'OT_RATE_INCLUDES_FRINGE',
        `The overtime rate for "${what}" looks like 1.5 times the rate plus the benefit.`,
        {
          ...where,
          detail: 'The rule is 1.5 times the base rate, and the benefit on top without a premium.',
          suggestedFix: `Overtime should be ${money(required)} an hour.`,
        },
      ),
    )
  }
  return out
}

function ratioFindings(model: WeekModel): Finding[] {
  const out: Finding[] = []
  const perDay = new Map<string, { apprentices: Set<string>; journey: Set<string> }>()
  for (const row of model.rows) {
    const ratio = row.classification?.apprenticeRatio
    if (!ratio) continue
    for (const cell of row.cells) {
      if (cell.hours.lte(ZERO)) continue
      const key = `${row.classificationId}|${cell.entry.workDate}`
      const bucket = perDay.get(key) ?? { apprentices: new Set(), journey: new Set() }
      if (row.worker.level === 'RA') bucket.apprentices.add(row.worker.id)
      else bucket.journey.add(row.worker.id)
      perDay.set(key, bucket)
    }
  }
  for (const [key, bucket] of perDay) {
    const [classificationId = '', workDate = ''] = key.split('|')
    const row = model.rows.find((item) => item.classificationId === classificationId)
    const text = row?.classification?.apprenticeRatio
    const ratio = text ? parseRatio(text) : null
    if (!ratio || !row) continue
    if (ratioExceeded(ratio, bucket.apprentices.size, bucket.journey.size)) {
      out.push(
        make(
          'APPRENTICE_RATIO',
          `On ${shortDate(workDate)} there are ${bucket.apprentices.size} apprentices and ${bucket.journey.size} journeyworkers on "${label(row, model)}".`,
          {
            classificationId,
            workDate,
            detail: `The ratio for this trade is ${text}.`,
            suggestedFix: 'Pay the apprentices over the ratio at the journeyworker rate.',
          },
        ),
      )
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Cells and days
// ---------------------------------------------------------------------------

function cellFindings(model: WeekModel): Finding[] {
  const out: Finding[] = []
  const nyReporting = model.input.project.nyReporting

  for (const row of model.rows) {
    const who = name(row.worker)
    const what = label(row, model)
    for (const cell of row.cells) {
      const where = {
        workerId: row.worker.id,
        classificationId: row.classificationId,
        workDate: cell.entry.workDate,
        field: 'hours',
      }
      if (cell.hours.lt(ZERO)) {
        out.push(
          make(
            'NEGATIVE_HOURS',
            `${who} has negative hours on ${shortDate(cell.entry.workDate)}.`,
            {
              ...where,
              suggestedFix: 'Enter the hours actually worked, or clear the cell.',
            },
          ),
        )
      }
      out.push(...splitFindings(cell, row, where, who, what, nyReporting))
      if (cell.entry.isHoliday) {
        out.push(
          make(
            'HOLIDAY_RULE_UNKNOWN',
            `${shortDate(cell.entry.workDate)} is marked as a holiday.`,
            {
              ...where,
              detail:
                'The holiday page of this wage schedule is not loaded, so the multiplier has to be confirmed by hand.',
              suggestedFix: 'Confirm the multiplier for this holiday on the cell.',
            },
          ),
        )
      }
    }
  }
  return out
}

function splitFindings(
  cell: CellModel,
  row: RowModel,
  where: { workerId: string; classificationId: string; workDate: string; field: string },
  who: string,
  what: string,
  nyReporting: boolean,
): Finding[] {
  const out: Finding[] = []
  const entry = cell.entry
  const manual = entry.stOverride !== null || entry.otOverride !== null
  if (manual) {
    const split = dec(entry.stOverride ?? '0').plus(dec(entry.otOverride ?? '0'))
    if (!split.eq(dec(entry.hours))) {
      out.push(
        make(
          'OT_SPLIT_MISMATCH',
          `The split ${hours(entry.stOverride ?? '0')} plus ${hours(entry.otOverride ?? '0')} is not ${hours(entry.hours)} hours.`,
          { ...where, suggestedFix: 'Correct the cell so the two parts add up to the day.' },
        ),
      )
    }
  }
  if (!nyReporting || !manual) return out

  const codes = row.classification?.otCodes ?? []
  const dow = dayOfWeek(entry.workDate)
  const isWeekend = dow === 0 || dow === 6
  const st = dec(entry.stOverride ?? '0')
  const weekend = weekendCodes(codes)

  if (isWeekend && weekend.length > 0 && st.gt(ZERO)) {
    out.push(
      make(
        'OT_NY_WEEKEND',
        `${who} has ${hours(st)} straight time hours on ${shortDate(entry.workDate)}, a weekend day.`,
        {
          ...where,
          detail: `"${what}" carries code ${weekend.join(', ')}, which pays a premium that day.`,
          suggestedFix: 'Book the weekend hours as overtime, or let the engine split them.',
        },
      ),
    )
    return out
  }
  if (st.gt(cell.nySplit.codeSt)) {
    out.push(
      make(
        'OT_NY_CODE',
        `${who} has ${hours(st)} straight time hours on ${shortDate(entry.workDate)}; the code allows ${hours(cell.nySplit.codeSt)}.`,
        {
          ...where,
          detail: `"${what}" carries code ${codes.join(', ')} (see spec of the wage schedule).`,
          suggestedFix: 'Let the engine split the day, or correct the split you typed.',
        },
      ),
    )
  }
  const makeup = makeupCodes(codes)
  if (isWeekend && makeup.length > 0 && cell.otHours.lte(ZERO) && cell.hours.gt(ZERO)) {
    out.push(
      make(
        'OT_NY_MAKEUP_DAY',
        `Code ${makeup.join(', ')} allows a weekend make-up day at the regular rate.`,
        {
          ...where,
          detail: 'If a day was lost to weather, these hours are right as they are.',
        },
      ),
    )
  }
  return out
}

function dayFindings(model: WeekModel): Finding[] {
  const out: Finding[] = []
  for (const worker of model.workers) {
    const perDay = new Map<string, Dec>()
    for (const cell of worker.cells) {
      const date = cell.entry.workDate
      perDay.set(date, (perDay.get(date) ?? ZERO).plus(cell.hours))
    }
    for (const [date, total] of [...perDay].sort()) {
      const where = { workerId: worker.worker.id, workDate: date, field: 'hours' }
      const who = name(worker.worker)
      if (total.gt(24)) {
        out.push(
          make(
            'DAY_OVER_24',
            `${who} has ${hours(total)} hours on ${shortDate(date)}. A day has 24.`,
            {
              ...where,
              suggestedFix: 'Correct the hours for that day.',
            },
          ),
        )
      }
      if (total.gt(16)) {
        out.push(
          make(
            'DAY_OVER_16',
            `${who} has ${hours(total)} hours on ${shortDate(date)}. Check it is not a typo.`,
            where,
          ),
        )
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Notices (spec/07 §3.7): only when the context carries the dates they need
// ---------------------------------------------------------------------------

function notices(model: WeekModel): Finding[] {
  const { context, project, period } = model.input
  const out: Finding[] = []
  const today = context.today
  if (period.isNoWork) {
    out.push(
      make('NO_WORK_WEEK_PORTAL', 'A no work week is not filed as a file.', {
        detail: 'It is ticked in the portal as a no work week, or entered as work pause dates.',
        suggestedFix: 'Open the portal and tick the week; the app keeps the record.',
      }),
    )
  }
  if (!today) return out

  if (project.nyReporting) {
    const from = project.lastAcceptedSubmissionAt ?? project.startDate
    const due = addDays(from, STATE_INTERVAL_DAYS)
    const left = daysBetween(today, due)
    const deadlineText = `The next NY filing is due ${shortDate(due)}.`
    if (left <= 0) {
      out.push(make('STATE_DEADLINE_T0', `${deadlineText} That is today or earlier.`))
    } else if (left <= 2) {
      out.push(make('STATE_DEADLINE_T2', `${deadlineText} ${left} days left.`))
    } else if (left <= 5) {
      out.push(make('STATE_DEADLINE_T5', `${deadlineText} ${left} days left.`))
    } else if (left <= 10) {
      out.push(make('STATE_DEADLINE_T10', `${deadlineText} ${left} days left.`))
    }
    if (daysBetween(due, today) > STATE_GRACE_DAYS) {
      out.push(
        make(
          'STATE_DEADLINE_PENALTY',
          `The NY filing is ${daysBetween(due, today)} days late, past the 14 day grace period.`,
          {
            detail: 'A penalty of $100 a day is legally possible from here on.',
            suggestedFix: 'File the outstanding weeks in the portal today.',
          },
        ),
      )
    }
  }
  if (project.federalReporting && context.payDate) {
    const due = addDays(context.payDate, FEDERAL_DUE_DAYS)
    const left = daysBetween(today, due)
    if (left <= 2 && left >= 0) {
      out.push(
        make('FEDERAL_DUE_T2', `The WH-347 is due ${shortDate(due)}, 7 days after the pay date.`),
      )
    }
  }
  if (dayOfWeek(today) === MONDAY && (period.status === 'open' || period.status === 'in_review')) {
    out.push(make('REMINDER_DUE', 'Last week is still open.'))
  }
  if (context.wageScheduleUpdatedAt) {
    const newest = model.input.classifications
      .map((item) => item.effectiveFrom)
      .sort()
      .pop()
    if (!newest || context.wageScheduleUpdatedAt > newest) {
      out.push(
        make('RATE_UPDATE_AVAILABLE', 'The wage schedule holds rates newer than this project.', {
          detail: `The schedule was updated on ${shortDate(context.wageScheduleUpdatedAt)}.`,
          suggestedFix: 'Review the new rates and copy them into the project.',
        }),
      )
    }
  }
  if (context.retroactiveEffectiveFrom) {
    const affected = context.priorWeeks.filter(
      (week) =>
        week.weekEnding >= (context.retroactiveEffectiveFrom ?? '') &&
        (week.status === 'signed' || week.status === 'submitted'),
    )
    if (affected.length > 0) {
      out.push(
        make(
          'RATE_RETROACTIVE_CHANGE',
          `A rate change effective ${shortDate(context.retroactiveEffectiveFrom)} reaches ${affected.length} weeks that are already filed.`,
          {
            detail: 'NY publishes corrections monthly and they apply back to 1 July.',
            suggestedFix: 'Create corrections for the weeks that are affected.',
          },
        ),
      )
    }
  }
  const gap = firstGap(context.priorWeeks)
  if (gap) {
    out.push(
      make('PAYROLL_GAP', `The week ending ${shortDate(gap)} has no report.`, {
        detail: 'Payroll numbers run without gaps, so every week has to be covered.',
        suggestedFix: 'Create that week; it may be a no work week.',
      }),
    )
  }
  if (context.oldestReportWeekEnding) {
    const notice = addMonths(context.oldestReportWeekEnding, 12 * 5 + 9)
    if (today >= notice) {
      out.push(
        make('RETENTION_APPROACHING', 'Reports are approaching the end of the retention period.', {
          detail: `The oldest report covers the week ending ${shortDate(context.oldestReportWeekEnding)}.`,
        }),
      )
    }
  }
  return out
}

/** A week with no period at all, after a week that was already signed or filed. */
function firstGap(weeks: readonly { weekEnding: string; status: string | null }[]): string | null {
  let sawClosed = false
  for (const week of [...weeks].sort((a, b) => a.weekEnding.localeCompare(b.weekEnding))) {
    if (week.status === null && sawClosed) return week.weekEnding
    if (week.status === 'signed' || week.status === 'submitted') sawClosed = true
  }
  return null
}
