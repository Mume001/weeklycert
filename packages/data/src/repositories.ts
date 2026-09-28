// The data contract the app sees (spec/19 §3). Two implementations share it:
// mock/ now, drizzle/ in step 4. apps/web imports only this interface and
// getRepositories(), never an implementation.
import type { WeekInput } from '@wc/core'
import type { Table as ImportTable } from '@wc/core/import'
import type {
  AccountDTO,
  AdminHealthDTO,
  AllocationInput,
  AllocationSaveResult,
  ArchiveDTO,
  ArchiveFilter,
  ArchiveStatus,
  AuditDTO,
  AuditFilter,
  BillingDTO,
  CancelInput,
  ClassificationEditInput,
  ClassificationInput,
  ClassificationSaveResult,
  CompanyFormDTO,
  CompanyInput,
  CompanySaveResult,
  DashboardDTO,
  Finding,
  FirmNextDTO,
  FlagKey,
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
  InvitableRole,
  InvitationDTO,
  InviteInput,
  InviteResult,
  IsoDate,
  MembershipRole,
  NotificationsDTO,
  NotificationsInput,
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
  RegisterErrorCode,
  RegisterInput,
  ReportStatusDTO,
  ReportsDTO,
  ReviewDTO,
  SetupTier,
  SignerDTO,
  SignerInput,
  SignersDTO,
  SignInput,
  SignInResult,
  SmsInput,
  SubmissionDTO,
  TeamDTO,
  TenantBrief,
  TenantDTO,
  Timezone,
  TokenKind,
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

/** The words inside an archive export, from packages/copy (spec/20 J). */
export type ArchiveExportTexts = {
  readme: string
  headers: string[]
  statuses: Record<ArchiveStatus, string>
}

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
  dashboard: {
    get(tenantId: Uuid): Promise<DashboardDTO>
    /** The company's nearest deadline, for its card on /firms (spec/03 §4.2). */
    firmNext(tenantId: Uuid): Promise<FirmNextDTO>
  }
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
    /**
     * The week's own pay date (spec/01 §2.9); null goes back to the company's
     * setting. Refused once the week is locked.
     */
    setPayDate(tenantId: Uuid, periodId: Uuid, date: IsoDate | null): Promise<void>
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
    /**
     * Our template for one week (spec/06 §6). `headers` are the column names
     * the customer reads, from packages/copy. Null for another company's project.
     */
    template(
      tenantId: Uuid,
      projectId: Uuid,
      weekEnding: IsoDate,
      options: {
        kind: 'hours' | 'payroll'
        format: 'csv' | 'xlsx'
        headers: Record<string, string>
      },
    ): Promise<{ name: string; contentType: string; body: Uint8Array } | null>
  }
  /** The archive (spec/03 §4.8): every signed version, and the export of one project. */
  archive: {
    list(tenantId: Uuid, filter?: ArchiveFilter): Promise<ArchiveDTO>
    /**
     * "Export everything for this project". In the mock phase an EXAMPLE zip from
     * the fixtures (spec/20 J); `texts` are the words in it, from packages/copy.
     * Null for another company's project.
     */
    export(
      tenantId: Uuid,
      projectId: Uuid,
      texts: ArchiveExportTexts,
    ): Promise<{ name: string; contentType: string; body: Uint8Array<ArrayBuffer> } | null>
  }
  /**
   * Sign-in and the account (spec/03 §4.1, §4.2). No company: the user is the
   * one signing in, or the signed-in user's own account. Mock until step 4.
   */
  auth: {
    signIn(email: string, password: string): Promise<SignInResult>
    issueToken(kind: TokenKind, email: string): Promise<string>
    /** Reads without using: opening a link is not clicking it (03 §4.1). */
    peekToken(kind: TokenKind, token: string): Promise<{ email: string } | null>
    consumeToken(
      kind: TokenKind,
      token: string,
    ): Promise<{ email: string; userId: Uuid | null; role: MembershipRole | null } | null>
    register(
      input: RegisterInput,
      withInvitation: boolean,
    ): Promise<{ ok: true; token: string } | { ok: false; error: RegisterErrorCode }>
    invitation(token: string): Promise<InvitationDTO | null>
    account(userId: Uuid): Promise<AccountDTO | null>
    renameUser(userId: Uuid, name: string): Promise<void>
    signOutSession(userId: Uuid, sessionId: string): Promise<void>
    signOutEverywhere(userId: Uuid): Promise<void>
  }
  /** 04 feature_flags: the company's own row wins over the global one (09 §4). */
  flags: { isOn(tenantId: Uuid, key: FlagKey): Promise<boolean> }
  /** The settings of a company (spec/03 §4.9). Every write takes who acts, for the audit log. */
  settings: {
    team(tenantId: Uuid): Promise<TeamDTO>
    invite(tenantId: Uuid, actorUserId: Uuid, input: InviteInput): Promise<InviteResult>
    revokeInvitation(tenantId: Uuid, actorUserId: Uuid, invitationId: Uuid): Promise<void>
    /** Never the owner's row, never to owner (spec/02 §3). */
    changeRole(
      tenantId: Uuid,
      actorUserId: Uuid,
      membershipId: Uuid,
      role: InvitableRole,
    ): Promise<void>
    removeMember(tenantId: Uuid, actorUserId: Uuid, membershipId: Uuid): Promise<void>
    signers(tenantId: Uuid): Promise<SignersDTO>
    addSigner(tenantId: Uuid, actorUserId: Uuid, input: SignerInput): Promise<void>
    setSignerActive(
      tenantId: Uuid,
      actorUserId: Uuid,
      signerId: Uuid,
      active: boolean,
    ): Promise<void>
    setBookkeeperCanSign(
      tenantId: Uuid,
      actorUserId: Uuid,
      membershipId: Uuid,
      canSign: boolean,
    ): Promise<void>
    billing(tenantId: Uuid): Promise<BillingDTO>
    pause(tenantId: Uuid, actorUserId: Uuid, months: number): Promise<void>
    unpause(tenantId: Uuid, actorUserId: Uuid): Promise<void>
    /** At the end of the period (spec/08 §2.3). */
    cancel(tenantId: Uuid, actorUserId: Uuid, input: CancelInput): Promise<void>
    keepSubscription(tenantId: Uuid, actorUserId: Uuid): Promise<void>
    notifications(tenantId: Uuid): Promise<NotificationsDTO>
    saveNotifications(tenantId: Uuid, input: NotificationsInput): Promise<void>
    /** Null turns text messages off; on, the exact consent text is kept (spec/11, TCPA). */
    setSms(tenantId: Uuid, input: SmsInput | null, consentText: string): Promise<void>
    auditLog(tenantId: Uuid, filter?: AuditFilter): Promise<AuditDTO>
    companyExtras(tenantId: Uuid): Promise<{
      timezone: string
      logo: { contentType: string; base64: string } | null
    }>
    setCompanyExtras(
      tenantId: Uuid,
      actorUserId: Uuid,
      input: { timezone: Timezone; logo?: { contentType: string; base64: string } | null },
    ): Promise<void>
    /** "Export everything": JSON and the archives; reading PII logs purpose export. */
    exportAll(
      tenantId: Uuid,
      actorUserId: Uuid,
      archiveTexts: ArchiveExportTexts,
    ): Promise<{ name: string; contentType: string; body: Uint8Array<ArrayBuffer> }>
    /** 30 days of grace, read-only with export, then the purge. */
    requestDeletion(tenantId: Uuid, actorUserId: Uuid): Promise<void>
  }
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
