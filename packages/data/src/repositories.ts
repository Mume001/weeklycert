// The data contract the app sees (spec/19 §3). Two implementations share it:
// mock/ now, drizzle/ in step 4. apps/web imports only this interface and
// getRepositories(), never an implementation.
import type { WeekInput } from '@wc/core'
import type { Table as ImportTable } from '@wc/core/import'
import type {
  AdminHealthDTO,
  AllocationInput,
  AllocationSaveResult,
  ArchiveFilter,
  ArchiveRowDTO,
  ClassificationEditInput,
  ClassificationInput,
  ClassificationSaveResult,
  CompanyFormDTO,
  CompanyInput,
  CompanySaveResult,
  DashboardDTO,
  Finding,
  FringePlanInput,
  FringePlansDTO,
  FringeSaveResult,
  GridRow,
  ImportApplyResult,
  ImportBatchDTO,
  ImportDraftDTO,
  ImportMappingInput,
  ImportResolveInput,
  ImportStart,
  IsoDate,
  OnboardingDTO,
  OpenWeeksDTO,
  PayrollInput,
  PiiPart,
  PiiValue,
  ProjectClassificationsDTO,
  ProjectFormDTO,
  ProjectInput,
  ProjectListFilter,
  ProjectRowDTO,
  ProjectSaveResult,
  ProjectTimelineDTO,
  RateVersionInput,
  ReportStatusDTO,
  ReportsDTO,
  ReviewDTO,
  SetupTier,
  SignerDTO,
  SignInput,
  SubmissionDTO,
  TenantBrief,
  TenantDTO,
  UserDTO,
  Uuid,
  WeekGridDTO,
  WorkerFormDTO,
  WorkerInput,
  WorkerListFilter,
  WorkerNameDTO,
  WorkerRowDTO,
  WorkerSaveResult,
} from './dto/index.ts'
import { mockRepositories } from './mock/index.ts'

export interface Repositories {
  /** Today in the tenant's time zone. MOCK_TODAY in the mock phase. */
  today(): IsoDate
  /** The moment a write happened, for "Saved {HH:MM}". Fixed in the mock phase. */
  now(): string
  users: { get(userId: Uuid): Promise<UserDTO | null> }
  tenants: {
    /** Companies the user is an active member of. */
    listForUser(userId: Uuid): Promise<TenantBrief[]>
    getBySlug(slug: string): Promise<TenantDTO | null>
    /** The company profile, onboarding step 1 (spec/03 §4.3). */
    company(tenantId: Uuid): Promise<CompanyFormDTO>
    updateCompany(tenantId: Uuid, input: CompanyInput): Promise<CompanySaveResult>
    /** Where the wizard stands; each step is saved as it is done (03 §4.3). */
    onboarding(tenantId: Uuid): Promise<OnboardingDTO>
    completeOnboardingStep(tenantId: Uuid, step: number, skipped: boolean): Promise<void>
    /** Step 7 in the mock phase: the tier is saved, nothing is charged (spec/20 H). */
    chooseSetupTier(tenantId: Uuid, tier: SetupTier): Promise<void>
  }
  dashboard: { get(tenantId: Uuid): Promise<DashboardDTO> }
  projects: {
    list(tenantId: Uuid, filter?: ProjectListFilter): Promise<ProjectRowDTO[]>
    /** Null when the project does not exist in this company (the page answers 404). */
    timeline(tenantId: Uuid, projectId: Uuid): Promise<ProjectTimelineDTO | null>
    /** The form's starting values; `projectId` null is a new project. */
    form(tenantId: Uuid, projectId: Uuid | null): Promise<ProjectFormDTO | null>
    /** `input` has passed ProjectInputSchema; this adds the checks that need data (unique PRC). */
    create(tenantId: Uuid, input: ProjectInput): Promise<ProjectSaveResult>
    update(tenantId: Uuid, projectId: Uuid, input: ProjectInput): Promise<ProjectSaveResult>
    classifications(tenantId: Uuid, projectId: Uuid): Promise<ProjectClassificationsDTO | null>
    addClassification(
      tenantId: Uuid,
      projectId: Uuid,
      input: ClassificationInput,
    ): Promise<ClassificationSaveResult>
    /** A new row from a date; the old row's rates are never overwritten (spec/03 §4.4). */
    addRateVersion(
      tenantId: Uuid,
      projectId: Uuid,
      input: RateVersionInput,
    ): Promise<ClassificationSaveResult>
    editClassification(
      tenantId: Uuid,
      projectId: Uuid,
      input: ClassificationEditInput,
    ): Promise<ClassificationSaveResult>
    /** Open weeks on active projects, for "This week" (spec/03 §3). */
    openWeeks(tenantId: Uuid): Promise<OpenWeeksDTO>
  }
  weeks: {
    /** Null when the project is not this company's (the page answers 404). */
    grid(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Promise<WeekGridDTO | null>
    /**
     * The same week as the engine sees it. The grid runs `computeWeek()` in the
     * browser on every keystroke (spec/19 §6), and for that it needs the input,
     * not the result. Only roles that may read worker addresses get it
     * (spec/02 §3); a viewer reads the DTO, which carries no PII.
     */
    engineInput(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Promise<WeekInput | null>
    /** Throws for a period that is not this company's, the same as for one that does not exist. */
    patchCell(
      tenantId: Uuid,
      periodId: Uuid,
      rowId: string,
      day: number,
      raw: string,
    ): Promise<GridRow>
    /** The findings the server computed, which are the ones that count (spec/03 §4.5). */
    findings(tenantId: Uuid, periodId: Uuid): Promise<Finding[] | null>
    copyPreviousWeek(tenantId: Uuid, periodId: Uuid): Promise<WeekGridDTO>
    /** The week's period, created open if it has none yet (spec/04 §7.1, first row). */
    open(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Promise<Uuid>
    markNoWork(tenantId: Uuid, periodId: Uuid): Promise<void>
    /** The week as the review screen reads it; null when the project is not this company's. */
    review(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Promise<ReviewDTO | null>
    /** Gross for all work, deductions and net for one worker (spec/03 §4.5). */
    savePayroll(tenantId: Uuid, periodId: Uuid, input: PayrollInput): Promise<void>
  }
  /** Generating, signing and filing one week (spec/03 §4.5). */
  reports: {
    list(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Promise<ReportsDTO | null>
    /** Refuses while a blocking finding is open (spec/05 §1 point 2). */
    generate(tenantId: Uuid, periodId: Uuid): Promise<{ reportId: Uuid; version: number }>
    /** The generate job's progress, polled by the screen (spec/19 §2). */
    status(tenantId: Uuid, reportId: Uuid): Promise<ReportStatusDTO | null>
    /** Who signs, prefilled from `signers` (spec/04 §3.2). Null for a user who is not a member. */
    signer(tenantId: Uuid, userId: Uuid): Promise<SignerDTO | null>
    /** Signs, locks the week and hands out the payroll number (spec/04 §7.1). */
    sign(
      tenantId: Uuid,
      periodId: Uuid,
      userId: Uuid,
      input: SignInput,
    ): Promise<{ payrollNumber: number }>
    recordSubmission(
      tenantId: Uuid,
      periodId: Uuid,
      input: { channel: SubmissionDTO['channel']; confirmationRef: string; recipient?: string },
    ): Promise<void>
    recordOutcome(
      tenantId: Uuid,
      submissionId: Uuid,
      outcome: 'accepted' | 'rejected',
      reason: string,
    ): Promise<void>
    createCorrection(tenantId: Uuid, periodId: Uuid, note: string): Promise<{ periodId: Uuid }>
    /**
     * The example file behind a download (spec/19 §11). The tenant is part of
     * the lookup, not only of the guard: a file id alone must never reach
     * another company's row (spec/02 §4 rule 2, which RLS enforces in step 4).
     */
    file(
      tenantId: Uuid,
      fileId: string,
    ): Promise<{ name: string; contentType: string; body: string } | null>
  }
  /** Workers (spec/03 §4.6). No DTO here carries PII; that is readPii, one part at a time. */
  workers: {
    list(tenantId: Uuid, filter?: WorkerListFilter): Promise<WorkerRowDTO[]>
    /** The viewer's list: name and classification only (spec/02 §3). */
    names(tenantId: Uuid, filter?: WorkerListFilter): Promise<WorkerNameDTO[]>
    /** The viewer's detail; null when the worker is not this company's. */
    name(tenantId: Uuid, workerId: Uuid): Promise<WorkerNameDTO | null>
    /** The form's starting values; `workerId` null is a new worker. */
    form(tenantId: Uuid, workerId: Uuid | null): Promise<WorkerFormDTO | null>
    /** `input` has passed WorkerInputSchema; this adds the checks that need data. */
    create(tenantId: Uuid, input: WorkerInput): Promise<WorkerSaveResult>
    update(tenantId: Uuid, workerId: Uuid, input: WorkerInput): Promise<WorkerSaveResult>
    /** Show: one PII part, and a row in pii_access_log (spec/04 §6). */
    readPii(tenantId: Uuid, workerId: Uuid, userId: Uuid, part: PiiPart): Promise<PiiValue | null>
    /** A fringe plan for one worker (worker_fringe_allocations); the engine credits it. */
    addAllocation(
      tenantId: Uuid,
      workerId: Uuid,
      input: AllocationInput,
    ): Promise<AllocationSaveResult>
    /** Changes one, or ends it with a "to" date; the weeks before keep their credit. */
    updateAllocation(
      tenantId: Uuid,
      workerId: Uuid,
      allocationId: Uuid,
      input: AllocationInput,
    ): Promise<AllocationSaveResult>
  }
  fringe: {
    list(tenantId: Uuid): Promise<FringePlansDTO>
    create(tenantId: Uuid, input: FringePlanInput): Promise<FringeSaveResult>
    update(tenantId: Uuid, planId: Uuid, input: FringePlanInput): Promise<FringeSaveResult>
  }
  /** Imports (spec/03 §4.7, spec/06). Reading the file is core's; these keep the batch. */
  imports: {
    list(tenantId: Uuid): Promise<ImportBatchDTO[]>
    get(tenantId: Uuid, batchId: Uuid): Promise<ImportBatchDTO | null>
    /** Step 1: the table read from the upload; full SSNs are cut to four digits here. */
    start(
      tenantId: Uuid,
      userId: Uuid,
      start: ImportStart,
      file: { name: string; sha256: string; table: ImportTable },
    ): Promise<Uuid>
    draft(tenantId: Uuid, batchId: Uuid): Promise<ImportDraftDTO>
    setMapping(
      tenantId: Uuid,
      batchId: Uuid,
      input: ImportMappingInput,
    ): Promise<{ ok: true } | { ok: false; missing: string[] }>
    resolve(tenantId: Uuid, batchId: Uuid, input: ImportResolveInput): Promise<void>
    confirmCheck(tenantId: Uuid, batchId: Uuid, skipErrors: boolean): Promise<{ ok: boolean }>
    apply(tenantId: Uuid, batchId: Uuid, userId: Uuid): Promise<ImportApplyResult>
    undo(
      tenantId: Uuid,
      batchId: Uuid,
    ): Promise<{ ok: true } | { ok: false; refused: 'locked' | 'expired' }>
  }
  archive: { list(tenantId: Uuid, filter?: ArchiveFilter): Promise<ArchiveRowDTO[]> }
  admin: { health(): Promise<AdminHealthDTO> }
}

/** Picks the implementation. In the mock phase `mock` is the only value (spec/19 §1). */
export function getRepositories(): Repositories {
  const source = process.env.DATA_SOURCE || 'mock'
  if (source !== 'mock') {
    throw new Error(
      `DATA_SOURCE="${source}" is not available: mock is the only data source until step 4 (spec/19 §1).`,
    )
  }
  return mockRepositories
}
