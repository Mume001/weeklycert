// The data contract the app sees (spec/19 §3). Two implementations share it:
// mock/ now, drizzle/ in step 4. apps/web imports only this interface and
// getRepositories(), never an implementation.
import type {
  AdminHealthDTO,
  ArchiveFilter,
  ArchiveRowDTO,
  DashboardDTO,
  FringePlanDTO,
  GridRow,
  ImportBatchDTO,
  ImportPreviewDTO,
  IsoDate,
  OpenWeeksDTO,
  ProjectListFilter,
  ProjectRowDTO,
  ProjectTimelineDTO,
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
  users: { get(userId: Uuid): Promise<UserDTO | null> }
  tenants: {
    /** Companies the user is an active member of. */
    listForUser(userId: Uuid): Promise<TenantBrief[]>
    getBySlug(slug: string): Promise<TenantDTO | null>
  }
  dashboard: { get(tenantId: Uuid): Promise<DashboardDTO> }
  projects: {
    list(tenantId: Uuid, filter?: ProjectListFilter): Promise<ProjectRowDTO[]>
    timeline(tenantId: Uuid, projectId: Uuid): Promise<ProjectTimelineDTO>
    /** Open weeks on active projects, for "This week" (spec/03 §3). */
    openWeeks(tenantId: Uuid): Promise<OpenWeeksDTO>
  }
  weeks: {
    grid(projectId: Uuid, weekEnding: IsoDate): Promise<WeekGridDTO>
    patchCell(periodId: Uuid, rowId: string, day: number, raw: string): Promise<GridRow>
    copyPreviousWeek(periodId: Uuid): Promise<WeekGridDTO>
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
