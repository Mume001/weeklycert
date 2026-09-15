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
} from './schema.ts'

function load<T extends z.ZodType>(name: string, schema: T, rows: unknown): z.infer<T>[] {
  const parsed = z.array(schema).safeParse(rows)
  if (!parsed.success) {
    throw new Error(`fixtures/${name}.json is invalid:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

export const db = {
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
}

export type MockDb = typeof db
