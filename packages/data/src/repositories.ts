// The data contract the app sees (spec/19 §3). Two implementations share it:
// mock/ now, drizzle/ in step 4. apps/web imports only this interface and
// getRepositories(), never an implementation.
import type { WeekInput } from '@wc/core'
import type {
  AdminHealthDTO,
  ArchiveFilter,
  ArchiveRowDTO,
  ClassificationEditInput,
  ClassificationInput,
  ClassificationSaveResult,
  DashboardDTO,
  Finding,
  FringePlanDTO,
  GridRow,
  ImportBatchDTO,
  ImportPreviewDTO,
  IsoDate,
  OpenWeeksDTO,
  ProjectClassificationsDTO,
  ProjectFormDTO,
  ProjectInput,
  ProjectListFilter,
  ProjectRowDTO,
  ProjectSaveResult,
  ProjectTimelineDTO,
  RateVersionInput,
  ReviewDTO,
  TenantBrief,
  TenantDTO,
  UserDTO,
  Uuid,
  WeekGridDTO,
  WorkerDTO,
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
    grid(projectId: Uuid, weekEnding: IsoDate): Promise<WeekGridDTO>
    /**
     * The same week as the engine sees it. The grid runs `computeWeek()` in the
     * browser on every keystroke (spec/19 §6), and for that it needs the input,
     * not the result. Only roles that may read worker addresses get it
     * (spec/02 §3); a viewer reads the DTO, which carries no PII.
     */
    engineInput(projectId: Uuid, weekEnding: IsoDate): Promise<WeekInput>
    patchCell(periodId: Uuid, rowId: string, day: number, raw: string): Promise<GridRow>
    /** The findings the server computed, which are the ones that count (spec/03 §4.5). */
    findings(periodId: Uuid): Promise<Finding[]>
    copyPreviousWeek(periodId: Uuid): Promise<WeekGridDTO>
    /** The week's period, created open if it has none yet (spec/04 §7.1, first row). */
    open(tenantId: Uuid, projectId: Uuid, weekEnding: IsoDate): Promise<Uuid>
    markNoWork(periodId: Uuid): Promise<void>
    review(projectId: Uuid, weekEnding: IsoDate): Promise<ReviewDTO>
  }
  workers: {
    list(tenantId: Uuid): Promise<WorkerDTO[]>
    get(tenantId: Uuid, workerId: Uuid): Promise<WorkerDTO | null>
  }
  fringe: { list(tenantId: Uuid): Promise<FringePlanDTO[]> }
  imports: {
    list(tenantId: Uuid): Promise<ImportBatchDTO[]>
    preview(tenantId: Uuid, batchId: Uuid): Promise<ImportPreviewDTO>
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
