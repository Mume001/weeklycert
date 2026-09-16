// The catalogue of findings (spec/07 §3). Sixty rows, sixty three codes: the
// deduction row carries one code with two severities, and the state deadline
// row carries four codes.
//
// A code is stable for ever: the UI, `report_findings` and the acknowledgement
// table all key off it. A severity may be lifted by a tenant setting, never by
// the UI.
export type Severity = 'hard' | 'soft' | 'info'

export interface CatalogEntry {
  severity: Severity
  /** The rule behind it, shown next to the message. */
  rule?: string
}

export const FINDINGS = {
  // 3.1 Hours
  DAY_OVER_24: { severity: 'hard' },
  DAY_OVER_16: { severity: 'soft' },
  NEGATIVE_HOURS: { severity: 'hard' },
  DATE_OUTSIDE_WEEK: { severity: 'hard' },
  NO_HOURS_NOT_MARKED: { severity: 'soft' },
  NO_WORK_WITH_HOURS: { severity: 'hard' },
  WORKER_INACTIVE: { severity: 'soft' },
  WORKER_NO_CLASSIFICATION: { severity: 'hard' },
  CLASSIFICATION_NOT_ON_PROJECT: { severity: 'hard' },
  OT_SPLIT_MISMATCH: { severity: 'hard' },
  OT_FEDERAL_UNDERCOUNT: { severity: 'hard', rule: '29 CFR 5.5' },
  OT_NY_CODE: { severity: 'hard', rule: 'Labor Law 220' },
  OT_NY_CODE_MISSING: { severity: 'hard', rule: 'Labor Law 220' },
  OT_NY_WEEKEND: { severity: 'hard', rule: 'Labor Law 220' },
  OT_NY_MAKEUP_DAY: { severity: 'info', rule: 'Labor Law 220' },
  OT_NY_SUPPLEMENT_PREMIUM: { severity: 'info', rule: 'Labor Law 220' },
  HOLIDAY_RULE_UNKNOWN: { severity: 'soft' },

  // 3.2 Rates and benefits
  RATE_BELOW_WD: { severity: 'hard', rule: 'Labor Law 220' },
  OT_RATE_BELOW_1_5: { severity: 'hard', rule: '29 CFR 5.32' },
  OT_RATE_INCLUDES_FRINGE: { severity: 'soft', rule: '29 CFR 5.32' },
  FRINGE_SHORTFALL: { severity: 'hard', rule: '29 CFR 5.31' },
  FRINGE_LEGALLY_REQUIRED: { severity: 'hard', rule: '29 CFR 5.25' },
  FRINGE_NOT_ANNUALIZED: { severity: 'soft', rule: '29 CFR 5.25(b)' },
  FRINGE_NO_ALLOCATION: { severity: 'soft' },
  RATE_EXPIRED: { severity: 'hard' },
  RATE_RETROACTIVE_CHANGE: { severity: 'soft' },
  RATE_CHANGE_MIDWEEK: { severity: 'info' },
  WEIGHTED_AVERAGE_USED: { severity: 'info', rule: '29 CFR 778.115' },

  // 3.3 Apprentices
  APPRENTICE_NO_RECORD: { severity: 'hard', rule: '29 CFR 5.5(a)(4)' },
  APPRENTICE_RECORD_EXPIRED: { severity: 'hard', rule: '29 CFR 5.5(a)(4)' },
  APPRENTICE_RATIO: { severity: 'hard', rule: '29 CFR 5.5(a)(4)' },
  APPRENTICE_PCT_MISMATCH: { severity: 'soft' },

  // 3.4 Deductions and net pay
  NET_MISMATCH: { severity: 'hard' },
  GROSS_ALL_BELOW_PROJECT: { severity: 'hard' },
  GROSS_ALL_MISSING: { severity: 'soft' },
  /** Hard when merging is off, soft when the extra rows are merged into Other. */
  DEDUCTIONS_OVER_10: { severity: 'hard' },
  DEDUCTION_UNKNOWN_KIND: { severity: 'soft' },
  DEDUCTION_NEGATIVE: { severity: 'hard' },

  // 3.5 Worker and PII
  WORKER_ID_MISSING: { severity: 'hard' },
  /** Info by default; hard when the tenant asked for strict PII (spec/07 §3.5). */
  SSN4_AND_DOB: { severity: 'info', rule: '29 CFR 5.5(a)(3)(ii)(B)' },
  WORKER_ADDRESS_MISSING: { severity: 'hard' },
  WORKER_ADDRESS_TOO_LONG: { severity: 'hard' },
  WORKER_ZIP_FORMAT: { severity: 'hard' },
  WORKER_NAME_SUSPICIOUS: { severity: 'soft' },
  WORKER_DUPLICATE: { severity: 'soft' },

  // 3.6 Project and period
  PRC_MISSING: { severity: 'hard' },
  WD_MISSING: { severity: 'soft' },
  CLASSIFICATION_NOT_OFFICIAL: { severity: 'hard' },
  PAYROLL_GAP: { severity: 'soft' },
  PERIOD_LOCKED: { severity: 'hard' },
  FINAL_ALREADY_SET: { severity: 'hard' },
  PROJECT_NOT_ACTIVE: { severity: 'soft' },
  OVER_500_WORKERS: { severity: 'hard' },

  // 3.7 Notices
  STATE_DEADLINE_T10: { severity: 'info', rule: 'Labor Law 220-j' },
  STATE_DEADLINE_T5: { severity: 'info', rule: 'Labor Law 220-j' },
  STATE_DEADLINE_T2: { severity: 'info', rule: 'Labor Law 220-j' },
  STATE_DEADLINE_T0: { severity: 'info', rule: 'Labor Law 220-j' },
  STATE_DEADLINE_PENALTY: { severity: 'info', rule: 'Labor Law 220-j' },
  FEDERAL_DUE_T2: { severity: 'info', rule: '29 CFR 3.4(a)' },
  NO_WORK_WEEK_PORTAL: { severity: 'info' },
  REMINDER_DUE: { severity: 'info' },
  RATE_UPDATE_AVAILABLE: { severity: 'info' },
  RETENTION_APPROACHING: { severity: 'info', rule: 'Labor Law 220(3-a)' },
} as const satisfies Record<string, CatalogEntry>

export type FindingCode = keyof typeof FINDINGS

export const FINDING_CODES = Object.keys(FINDINGS) as FindingCode[]

/**
 * Codes whose repair is unambiguous, so the panel may offer a "Fix" button
 * (spec/19 §3 and §4). The list lives here, never in a component.
 */
export const AUTO_FIXABLE: FindingCode[] = ['DAY_OVER_24', 'RATE_EXPIRED']
