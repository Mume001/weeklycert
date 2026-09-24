// Loads every fixture file once and validates it. A broken fixture fails at
// startup with the zod message, not three screens later.
import { z } from 'zod'
import apprenticeRecords from './fixtures/apprentice-records.json'
import awardingBodies from './fixtures/awarding-bodies.json'
import classificationCatalog from './fixtures/classification-catalog.json'
import fringeAllocations from './fixtures/fringe-allocations.json'
import fringePlans from './fixtures/fringe-plans.json'
import memberships from './fixtures/memberships.json'
import periods from './fixtures/periods.json'
import projectClassifications from './fixtures/project-classifications.json'
import projects from './fixtures/projects.json'
import reports from './fixtures/reports.json'
import signers from './fixtures/signers.json'
import submissions from './fixtures/submissions.json'
import tenants from './fixtures/tenants.json'
import timeEntries from './fixtures/time-entries.json'
import users from './fixtures/users.json'
import workerPii from './fixtures/worker-pii.json'
import workers from './fixtures/workers.json'
import {
  ApprenticeRecordRow,
  AwardingBodyRow,
  CatalogRow,
  FringeAllocationRow,
  FringePlanRow,
  MembershipRow,
  PeriodRow,
  type PiiAccessLogRow,
  type PrimeContractorRow,
  ProjectClassificationRow,
  ProjectRow,
  ReportRow,
  SignerRow,
  SubmissionRow,
  TenantRow,
  TimeEntryRow,
  UserRow,
  WorkerPiiRow,
  WorkerRow,
  type WorkPauseRow,
} from './schema.ts'

function load<T extends z.ZodType>(name: string, schema: T, rows: unknown): z.infer<T>[] {
  const parsed = z.array(schema).safeParse(rows)
  if (!parsed.success) {
    throw new Error(`fixtures/${name}.json is invalid:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

function loadAll() {
  return {
    tenants: load('tenants', TenantRow, tenants),
    users: load('users', UserRow, users),
    memberships: load('memberships', MembershipRow, memberships),
    signers: load('signers', SignerRow, signers),
    awardingBodies: load('awarding-bodies', AwardingBodyRow, awardingBodies),
    classificationCatalog: load('classification-catalog', CatalogRow, classificationCatalog),
    projects: load('projects', ProjectRow, projects),
    projectClassifications: load(
      'project-classifications',
      ProjectClassificationRow,
      projectClassifications,
    ),
    workers: load('workers', WorkerRow, workers),
    workerPii: load('worker-pii', WorkerPiiRow, workerPii),
    apprenticeRecords: load('apprentice-records', ApprenticeRecordRow, apprenticeRecords),
    fringePlans: load('fringe-plans', FringePlanRow, fringePlans),
    fringeAllocations: load('fringe-allocations', FringeAllocationRow, fringeAllocations),
    periods: load('periods', PeriodRow, periods),
    reports: load('reports', ReportRow, reports),
    submissions: load('submissions', SubmissionRow, submissions),
    timeEntries: load('time-entries', TimeEntryRow, timeEntries),
    // Tables of spec/04 that have no fixture rows: the screens fill them.
    primeContractors: [] as z.infer<typeof PrimeContractorRow>[],
    workPauses: [] as z.infer<typeof WorkPauseRow>[],
    piiAccessLog: [] as z.infer<typeof PiiAccessLogRow>[],
  }
}

export type MockDb = ReturnType<typeof loadAll>

/**
 * One copy per server process, on `globalThis`. Screens now write (a new
 * project, a new rate version), and Next bundles pages, server actions and
 * route handlers separately: a plain module-level object would exist more than
 * once, one bundle would write into its copy and the next page would read the
 * other. Same reason as the edits in week-grid.ts.
 */
const store = globalThis as typeof globalThis & { __wcDb?: MockDb }
if (!store.__wcDb) store.__wcDb = loadAll()
export const db: MockDb = store.__wcDb

/** Only for tests: put every table back to the fixtures on disk. */
export function resetMockDb(): void {
  const fresh = loadAll()
  for (const key of Object.keys(fresh) as (keyof MockDb)[]) {
    const rows = db[key] as unknown[]
    rows.splice(0, rows.length, ...(fresh[key] as unknown[]))
  }
}
