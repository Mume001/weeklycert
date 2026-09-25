// Step 2, mapping (spec/06 §2): which column of the file feeds which field,
// suggested from the column names with "sure / likely / check" (03 §4.7).
// The synonyms come from the sources in 06 §1 and are NEPROVJERENO until real
// exports are in izvori/ (spec/13 A16).

export type ImportKind = 'hours' | 'payroll' | 'workers'

export const DEDUCTION_KINDS = [
  'federal_tax',
  'state_tax',
  'local_tax',
  'fica',
  'medicare',
  'sdi',
  'pfl',
  'union_dues',
  'garnishment',
  'insurance',
  'retirement_401k',
  'other',
] as const
export type DeductionKind = (typeof DEDUCTION_KINDS)[number]

const HOURS_TARGETS = ['worker', 'date', 'hours', 'classification', 'note'] as const
const PAYROLL_TARGETS = [
  'worker',
  'gross',
  'net',
  ...DEDUCTION_KINDS.map((k) => `deduction:${k}` as const),
] as const
const WORKER_TARGETS = [
  'fullName',
  'firstName',
  'lastName',
  'workerNumber',
  'classification',
  'address1',
  'city',
  'state',
  'zip',
  'ssnLast4',
  'dateOfBirth',
  'level',
  'pctOfJourney',
] as const

export type HoursTarget = (typeof HOURS_TARGETS)[number]
export type PayrollTarget = (typeof PAYROLL_TARGETS)[number]
export type WorkerTarget = (typeof WORKER_TARGETS)[number]
export type Target = HoursTarget | PayrollTarget | WorkerTarget

export const TARGETS: Record<ImportKind, readonly Target[]> = {
  hours: HOURS_TARGETS,
  payroll: PAYROLL_TARGETS,
  workers: WORKER_TARGETS,
}

/** Fields without which a row means nothing (06 §2 step 2). Workers need a name, one way or the other. */
export const REQUIRED: Record<ImportKind, readonly Target[]> = {
  hours: ['worker', 'date', 'hours'],
  payroll: ['worker', 'gross'],
  workers: [],
}

/** Target -> the column index it reads. A column feeds one field at most. */
export type Mapping = Partial<Record<Target, number>>
export type Confidence = 'sure' | 'likely' | 'check'

const SYNONYMS: Partial<Record<Target, string[]>> = {
  worker: ['employee', 'worker', 'name', 'emp name', 'employee name', 'team member', 'full name'],
  date: ['date', 'work date', 'day', 'local date', 'shift date'],
  hours: ['hours', 'hrs', 'reg hours', 'total hours', 'duration', 'regular hours'],
  classification: ['job code', 'classification', 'cost code', 'service item', 'job', 'trade'],
  note: ['notes', 'note', 'memo', 'comment'],
  gross: ['gross', 'gross pay', 'gross wages', 'total gross', 'gross earnings'],
  net: ['net', 'net pay', 'take home', 'net amount'],
  'deduction:federal_tax': [
    'federal',
    'federal income tax',
    'fed tax',
    'fit',
    'federal withholding',
  ],
  'deduction:state_tax': ['state', 'state income tax', 'nys tax', 'sit', 'state withholding'],
  'deduction:local_tax': ['local', 'city tax', 'nyc tax', 'local tax'],
  'deduction:fica': ['fica', 'social security', 'oasdi', 'ss tax'],
  'deduction:medicare': ['medicare', 'medicare tax'],
  'deduction:sdi': ['sdi', 'disability', 'ny sdi'],
  'deduction:pfl': ['pfl', 'paid family leave', 'ny pfl'],
  'deduction:union_dues': ['union', 'union dues', 'dues'],
  'deduction:garnishment': ['garnishment', 'child support', 'levy'],
  'deduction:insurance': ['insurance', 'health insurance', 'medical'],
  'deduction:retirement_401k': ['401k', '401(k)', 'retirement'],
  'deduction:other': ['other deduction', 'other deductions', 'misc deduction'],
  fullName: ['name', 'full name', 'employee', 'employee name', 'worker'],
  firstName: ['first name', 'first', 'given name'],
  lastName: ['last name', 'last', 'surname', 'family name'],
  workerNumber: [
    'employee id',
    'employee number',
    'emp id',
    'worker number',
    'id',
    'emp #',
    'number',
  ],
  address1: ['address', 'street', 'address 1', 'address line 1', 'street address'],
  city: ['city', 'town'],
  state: ['state', 'st'],
  zip: ['zip', 'zip code', 'postal code', 'zipcode'],
  ssnLast4: ['ssn', 'ssn last 4', 'last 4', 'ssn4', 'social security number', 'social'],
  dateOfBirth: ['date of birth', 'dob', 'birth date', 'birthday'],
  level: ['level', 'journeyman or apprentice', 'j/ra', 'status'],
  pctOfJourney: ['percent', 'apprentice percent', 'pct', '% of journeyman'],
}

const plain = (s: string) =>
  s
    .toLowerCase()
    .replace(/[_\-.:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The best column for each field: an exact synonym is sure, a name that
 * contains one is likely. A column is given to the first field that wants it.
 */
export function suggestMapping(
  headers: readonly string[],
  kind: ImportKind,
): { mapping: Mapping; confidence: Partial<Record<Target, Confidence>> } {
  const mapping: Mapping = {}
  const confidence: Partial<Record<Target, Confidence>> = {}
  const taken = new Set<number>()
  const names = headers.map(plain)
  for (const pass of ['sure', 'likely'] as const) {
    for (const target of TARGETS[kind]) {
      if (mapping[target] !== undefined) continue
      const words = SYNONYMS[target] ?? []
      const at = names.findIndex(
        (n, i) =>
          !taken.has(i) &&
          (pass === 'sure' ? words.includes(n) : words.some((w) => w.length > 2 && n.includes(w))),
      )
      if (at >= 0) {
        mapping[target] = at
        confidence[target] = pass
        taken.add(at)
      }
    }
  }
  // Workers: a full name and a first and last name are two ways to the same thing.
  if (kind === 'workers' && mapping.firstName !== undefined && mapping.lastName !== undefined) {
    delete mapping.fullName
    delete confidence.fullName
  }
  return { mapping, confidence }
}

/** The fields a mapping still lacks; empty means it can be checked. */
export function missingTargets(kind: ImportKind, mapping: Mapping): Target[] {
  const missing = REQUIRED[kind].filter((t) => mapping[t] === undefined)
  if (
    kind === 'workers' &&
    mapping.fullName === undefined &&
    (mapping.firstName === undefined || mapping.lastName === undefined)
  ) {
    missing.push('fullName')
  }
  return missing
}

/**
 * The key a saved profile is found by: the column names, sorted, so a file with
 * the same columns loads its mapping at once (06 §2 step 2).
 */
export function headerHash(headers: readonly string[]): string {
  return [...headers].map(plain).sort().join('|')
}
