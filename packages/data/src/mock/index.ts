// Mock implementation over the fixtures, in memory (spec/19 §3).
// Session A implements what the app shell reads. Everything else throws
// NotYetBuiltError naming the session that builds it (spec/19 §10).
import { type Dow, openWeekEndings, weekEndingOf } from '@wc/core'
import type { OpenWeeksDTO, TenantBrief, TenantDTO, UserDTO } from '../dto/index.ts'
import { NotYetBuiltError } from '../not-yet.ts'
import type { Repositories } from '../repositories.ts'
import { mockNow, mockToday } from './clock.ts'
import { db } from './db.ts'
import { delay } from './delay.ts'
import {
  addClassification,
  addRateVersion,
  createProject,
  editClassification,
  listProjects,
  openWeek,
  projectClassifications,
  projectForm,
  projectTimeline,
  updateProject,
} from './projects.ts'
import {
  createCorrection,
  generate,
  recordOutcome,
  recordSubmission,
  reportStatus,
  reports,
  review,
  sampleFile,
  savePayroll,
  sign,
  signerFor,
} from './reports.ts'
import {
  buildWeekInput,
  copyPreviousWeek,
  markNoWork,
  ownProject,
  patchCell,
  periodFindings,
  weekGrid,
} from './week-grid.ts'

const later = (method: string, session: string) => async (): Promise<never> => {
  throw new NotYetBuiltError(method, session)
}

function activeProjectsOf(tenantId: string) {
  return db.projects.filter((p) => p.tenantId === tenantId && p.status === 'active')
}

function ownerOf(tenantId: string): { name: string; email: string } {
  const m = db.memberships.find((x) => x.tenantId === tenantId && x.role === 'owner')
  const u = m && db.users.find((x) => x.id === m.userId)
  if (!u) throw new Error(`Fixture tenant ${tenantId} has no owner`)
  return { name: u.name, email: u.email }
}

export const mockRepositories: Repositories = {
  today: () => mockToday(),
  now: () => mockNow(),

  users: {
    async get(userId) {
      await delay('users.get')
      const u = db.users.find((x) => x.id === userId)
      return u
        ? ({
            id: u.id,
            name: u.name,
            email: u.email,
            isSuperAdmin: u.isSuperAdmin,
          } satisfies UserDTO)
        : null
    },
  },

  tenants: {
    async listForUser(userId) {
      await delay('tenants.listForUser')
      return db.memberships
        .filter((m) => m.userId === userId && m.status === 'active')
        .flatMap((m): TenantBrief[] => {
          const t = db.tenants.find((x) => x.id === m.tenantId)
          if (!t) return []
          return [
            {
              id: t.id,
              slug: t.slug,
              name: t.legalName,
              role: m.role,
              canSign: m.canSign,
              activeProjects: activeProjectsOf(t.id).length,
            },
          ]
        })
    },

    async getBySlug(slug) {
      await delay('tenants.getBySlug')
      const t = db.tenants.find((x) => x.slug === slug)
      if (!t) return null
      return {
        id: t.id,
        slug: t.slug,
        legalName: t.legalName,
        status: t.status,
        trialEndsAt: t.trialEndsAt,
        pastDueSince: t.pastDueSince,
        weekEndsOn: t.settings.weekEndingDow,
        timezone: t.timezone,
        owner: ownerOf(t.id),
      } satisfies TenantDTO
    },
  },

  dashboard: { get: later('dashboard.get', 'E (dashboard, 03 §5 item 9)') },

  projects: {
    async list(tenantId, filter) {
      await delay('projects.list')
      return listProjects(tenantId, filter)
    },

    async timeline(tenantId, projectId) {
      await delay('projects.timeline')
      return projectTimeline(tenantId, projectId)
    },

    async form(tenantId, projectId) {
      await delay('projects.form')
      return projectForm(tenantId, projectId)
    },

    async create(tenantId, input) {
      await delay('projects.create')
      return createProject(tenantId, input)
    },

    async update(tenantId, projectId, input) {
      await delay('projects.update')
      return updateProject(tenantId, projectId, input)
    },

    async classifications(tenantId, projectId) {
      await delay('projects.classifications')
      return projectClassifications(tenantId, projectId)
    },

    async addClassification(tenantId, projectId, input) {
      await delay('projects.addClassification')
      return addClassification(tenantId, projectId, input)
    },

    async addRateVersion(tenantId, projectId, input) {
      await delay('projects.addRateVersion')
      return addRateVersion(tenantId, projectId, input)
    },

    async editClassification(tenantId, projectId, input) {
      await delay('projects.editClassification')
      return editClassification(tenantId, projectId, input)
    },

    async openWeeks(tenantId) {
      await delay('projects.openWeeks')
      const tenant = db.tenants.find((t) => t.id === tenantId)
      if (!tenant) throw new Error(`Unknown tenant ${tenantId}`)
      const today = mockToday()
      const weekEndsOn: Dow = tenant.settings.weekEndingDow
      return {
        today,
        currentWeekEnding: weekEndingOf(today, weekEndsOn),
        activeProjects: activeProjectsOf(tenantId).map((p) => ({
          id: p.id,
          name: p.name,
          openWeeks: openWeekEndings({
            startDate: p.startDate,
            endDate: p.actualEndDate,
            weekEndsOn,
            today,
            periods: db.periods.filter((x) => x.projectId === p.id),
          }),
        })),
      } satisfies OpenWeeksDTO
    },
  },

  weeks: {
    async grid(tenantId, projectId, weekEnding) {
      await delay('weeks.grid')
      return ownProject(tenantId, projectId) ? weekGrid(projectId, weekEnding) : null
    },

    async engineInput(tenantId, projectId, weekEnding) {
      await delay('weeks.engineInput')
      return ownProject(tenantId, projectId) ? buildWeekInput(projectId, weekEnding) : null
    },

    async patchCell(tenantId, periodId, rowId, day, raw) {
      await delay('weeks.patchCell')
      return patchCell(tenantId, periodId, rowId, day, raw)
    },

    async findings(tenantId, periodId) {
      await delay('weeks.findings')
      return periodFindings(tenantId, periodId)
    },

    async copyPreviousWeek(tenantId, periodId) {
      await delay('weeks.copyPreviousWeek')
      return copyPreviousWeek(tenantId, periodId)
    },

    async open(tenantId, projectId, weekEnding) {
      await delay('weeks.open')
      return openWeek(tenantId, projectId, weekEnding)
    },

    async markNoWork(tenantId, periodId) {
      await delay('weeks.markNoWork')
      markNoWork(tenantId, periodId)
    },

    async review(tenantId, projectId, weekEnding) {
      await delay('weeks.review')
      return review(tenantId, projectId, weekEnding)
    },

    async savePayroll(tenantId, periodId, input) {
      await delay('weeks.savePayroll')
      savePayroll(tenantId, periodId, input)
    },
  },

  reports: {
    async list(tenantId, projectId, weekEnding) {
      await delay('reports.list')
      return reports(tenantId, projectId, weekEnding)
    },

    async generate(tenantId, periodId) {
      await delay('reports.generate')
      return generate(tenantId, periodId)
    },

    async status(tenantId, reportId) {
      await delay('reports.status')
      return reportStatus(tenantId, reportId)
    },

    async signer(tenantId, userId) {
      await delay('reports.signer')
      return signerFor(tenantId, userId)
    },

    async sign(tenantId, periodId, userId, input) {
      await delay('reports.sign')
      return sign(tenantId, periodId, userId, input)
    },

    async recordSubmission(tenantId, periodId, input) {
      await delay('reports.recordSubmission')
      recordSubmission(tenantId, periodId, input)
    },

    async recordOutcome(tenantId, submissionId, outcome, reason) {
      await delay('reports.recordOutcome')
      recordOutcome(tenantId, submissionId, outcome, reason)
    },

    async createCorrection(tenantId, periodId, note) {
      await delay('reports.createCorrection')
      return createCorrection(tenantId, periodId, note)
    },

    async file(tenantId, fileId) {
      await delay('reports.file')
      return sampleFile(tenantId, fileId)
    },
  },
  workers: {
    list: later('workers.list', 'E (workers, 03 §5 item 5)'),
    get: later('workers.get', 'E (workers, 03 §5 item 5)'),
  },
  fringe: { list: later('fringe.list', 'E (fringe plans, 03 §5 item 5)') },
  imports: {
    list: later('imports.list', 'E (import, 03 §5 item 7)'),
    preview: later('imports.preview', 'E (import, 03 §5 item 7)'),
  },
  archive: { list: later('archive.list', 'E (archive, 03 §5 item 8)') },
  admin: { health: later('admin.health', 'E (admin, 03 §5 item 12)') },
}
