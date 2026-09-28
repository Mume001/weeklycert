// The platform admin (spec/03 §4.10). Cross-company by design: only the
// super-admin reads it (requireSuperAdmin, spec/11 §4), and a company's own
// data only through support access, which the owner sees (02 §1, 11 §2).
import type { IsoDate, TenantStatus, Uuid } from './common.ts'

export interface AdminTenantRowDTO {
  id: Uuid
  slug: string
  legalName: string
  status: TenantStatus
  plan: string | null
  activeProjects: number
  /** The newest row of its audit log, if any. */
  lastActivity: string | null
}

export interface AdminTenantDTO extends AdminTenantRowDTO {
  owner: { name: string; email: string } | null
  members: number
  createdOn: IsoDate | null
  /** An open support access by this admin, if any. */
  supportUntil: string | null
}

export type JobState = 'created' | 'active' | 'completed' | 'failed'
export interface JobDTO {
  id: Uuid
  queue: string
  state: JobState
  createdOn: string
  error: string | null
}

export type WageScheduleState = 'needs_review' | 'approved' | 'failed'
export interface WageScheduleDTO {
  id: Uuid
  kind: 'ny_prc' | 'federal_wd'
  reference: string
  fetchedAt: string
  state: WageScheduleState
  rateCount: number
}

export interface CatalogAdminDTO {
  version: string
  count: number
  added: string[]
  removed: string[]
}

/** 30 minutes of support access (03 §4.10, 11 §2). */
export const SUPPORT_ACCESS_MINUTES = 30
