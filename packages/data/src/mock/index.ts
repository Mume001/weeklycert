// Mock implementation over the fixtures, in memory (spec/19 §3).
// Session A implements what the app shell reads. Everything else throws
// NotYetBuiltError naming the session that builds it (spec/19 §10).
import { type Dow, openWeekEndings, weekEndingOf } from '@wc/core'
import type { OpenWeeksDTO, TenantBrief, TenantDTO, UserDTO } from '../dto/index.ts'
import { NotYetBuiltError } from '../not-yet.ts'
import { readPii } from '../pii.ts'
import type { Repositories } from '../repositories.ts'
import { exportArchive, listArchive } from './archive.ts'
import { mockNow, mockToday } from './clock.ts'
import {
  chooseSetupTier,
  companyForm,
  completeOnboardingStep,
  onboarding,
  updateCompany,
} from './company.ts'
import { dashboard, firmNext } from './dashboard.ts'
import { db } from './db.ts'
import { delay } from './delay.ts'
import {
  applyImport,
  confirmImportCheck,
  getImport,
  importDraft,
  importTemplate,
  listImports,
  resolveImport,
  setImportMapping,
  startImport,
  undoImport,
} from './imports.ts'
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
  setPayDate,
  sign,
  signerFor,
} from './reports.ts'
import * as settings from './settings.ts'
import {
  buildWeekInput,
  copyPreviousWeek,
  markNoWork,
  ownProject,
  patchCell,
  periodFindings,
  weekGrid,
} from './week-grid.ts'
import {
  addAllocation,
  createFringePlan,
  createWorker,
  fringePlans,
  listWorkers,
  updateAllocation,
  updateFringePlan,
  updateWorker,
  workerForm,
  workerName,
  workerNames,
} from './workers.ts'

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

    async company(tenantId) {
      await delay('tenants.company')
      return companyForm(tenantId)
    },

    async updateCompany(tenantId, input) {
      await delay('tenants.updateCompany')
      return updateCompany(tenantId, input)
    },

    async onboarding(tenantId) {
      await delay('tenants.onboarding')
      return onboarding(tenantId)
    },

    async completeOnboardingStep(tenantId, step, skipped) {
      await delay('tenants.completeOnboardingStep')
      completeOnboardingStep(tenantId, step, skipped)
    },

    async chooseSetupTier(tenantId, tier) {
      await delay('tenants.chooseSetupTier')
      chooseSetupTier(tenantId, tier)
    },
  },

  dashboard: {
    async get(tenantId) {
      await delay('dashboard.get')
      return dashboard(tenantId)
    },
    async firmNext(tenantId) {
      await delay('dashboard.firmNext')
      return firmNext(tenantId)
    },
  },

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

    async setPayDate(tenantId, periodId, date) {
      await delay('weeks.setPayDate')
      setPayDate(tenantId, periodId, date)
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
    async list(tenantId, filter) {
      await delay('workers.list')
      return listWorkers(tenantId, filter)
    },

    async names(tenantId, filter) {
      await delay('workers.names')
      return workerNames(tenantId, filter)
    },

    async name(tenantId, workerId) {
      await delay('workers.name')
      return workerName(tenantId, workerId)
    },

    async form(tenantId, workerId) {
      await delay('workers.form')
      return workerForm(tenantId, workerId)
    },

    async create(tenantId, input) {
      await delay('workers.create')
      return createWorker(tenantId, input)
    },

    async update(tenantId, workerId, input) {
      await delay('workers.update')
      return updateWorker(tenantId, workerId, input)
    },

    async readPii(tenantId, workerId, userId, part) {
      await delay('workers.readPii')
      return readPii(tenantId, userId, workerId, part)
    },

    async addAllocation(tenantId, workerId, input) {
      await delay('workers.addAllocation')
      return addAllocation(tenantId, workerId, input)
    },

    async updateAllocation(tenantId, workerId, allocationId, input) {
      await delay('workers.updateAllocation')
      return updateAllocation(tenantId, workerId, allocationId, input)
    },
  },

  fringe: {
    async list(tenantId) {
      await delay('fringe.list')
      return fringePlans(tenantId)
    },

    async create(tenantId, input) {
      await delay('fringe.create')
      return createFringePlan(tenantId, input)
    },

    async update(tenantId, planId, input) {
      await delay('fringe.update')
      return updateFringePlan(tenantId, planId, input)
    },
  },
  imports: {
    async list(tenantId) {
      await delay('imports.list')
      return listImports(tenantId)
    },

    async get(tenantId, batchId) {
      await delay('imports.get')
      return getImport(tenantId, batchId)
    },

    async start(tenantId, userId, start, file) {
      await delay('imports.start')
      return startImport(tenantId, userId, start, file)
    },

    async draft(tenantId, batchId) {
      await delay('imports.draft')
      return importDraft(tenantId, batchId)
    },

    async setMapping(tenantId, batchId, input) {
      await delay('imports.setMapping')
      return setImportMapping(tenantId, batchId, input)
    },

    async resolve(tenantId, batchId, input) {
      await delay('imports.resolve')
      resolveImport(tenantId, batchId, input)
    },

    async confirmCheck(tenantId, batchId, skipErrors) {
      await delay('imports.confirmCheck')
      return confirmImportCheck(tenantId, batchId, skipErrors)
    },

    async apply(tenantId, batchId, userId) {
      await delay('imports.apply')
      return applyImport(tenantId, batchId, userId)
    },

    async undo(tenantId, batchId) {
      await delay('imports.undo')
      return undoImport(tenantId, batchId)
    },

    async template(tenantId, projectId, weekEnding, options) {
      await delay('imports.template')
      return importTemplate(tenantId, projectId, weekEnding, options)
    },
  },
  archive: {
    async list(tenantId, filter) {
      await delay('archive.list')
      return listArchive(tenantId, filter)
    },

    async export(tenantId, projectId, texts) {
      await delay('archive.export')
      return exportArchive(tenantId, projectId, texts)
    },
  },
  settings: {
    async team(tenantId) {
      await delay('settings.team')
      return settings.team(tenantId)
    },
    async invite(tenantId, actorUserId, input) {
      await delay('settings.invite')
      return settings.invite(tenantId, actorUserId, input)
    },
    async revokeInvitation(tenantId, actorUserId, invitationId) {
      await delay('settings.revokeInvitation')
      settings.revokeInvitation(tenantId, actorUserId, invitationId)
    },
    async changeRole(tenantId, actorUserId, membershipId, role) {
      await delay('settings.changeRole')
      settings.changeRole(tenantId, actorUserId, membershipId, role)
    },
    async removeMember(tenantId, actorUserId, membershipId) {
      await delay('settings.removeMember')
      settings.removeMember(tenantId, actorUserId, membershipId)
    },
    async signers(tenantId) {
      await delay('settings.signers')
      return settings.signers(tenantId)
    },
    async addSigner(tenantId, actorUserId, input) {
      await delay('settings.addSigner')
      settings.addSigner(tenantId, actorUserId, input)
    },
    async setSignerActive(tenantId, actorUserId, signerId, active) {
      await delay('settings.setSignerActive')
      settings.setSignerActive(tenantId, actorUserId, signerId, active)
    },
    async setBookkeeperCanSign(tenantId, actorUserId, membershipId, canSign) {
      await delay('settings.setBookkeeperCanSign')
      settings.setBookkeeperCanSign(tenantId, actorUserId, membershipId, canSign)
    },
    async billing(tenantId) {
      await delay('settings.billing')
      return settings.billing(tenantId)
    },
    async pause(tenantId, actorUserId, months) {
      await delay('settings.pause')
      settings.pause(tenantId, actorUserId, months)
    },
    async unpause(tenantId, actorUserId) {
      await delay('settings.unpause')
      settings.unpause(tenantId, actorUserId)
    },
    async cancel(tenantId, actorUserId, input) {
      await delay('settings.cancel')
      settings.cancel(tenantId, actorUserId, input)
    },
    async keepSubscription(tenantId, actorUserId) {
      await delay('settings.keepSubscription')
      settings.keepSubscription(tenantId, actorUserId)
    },
    async notifications(tenantId) {
      await delay('settings.notifications')
      return settings.notifications(tenantId)
    },
    async saveNotifications(tenantId, input) {
      await delay('settings.saveNotifications')
      settings.saveNotifications(tenantId, input)
    },
    async setSms(tenantId, input, consentText) {
      await delay('settings.setSms')
      settings.setSms(tenantId, input, consentText)
    },
    async auditLog(tenantId, filter) {
      await delay('settings.auditLog')
      return settings.auditLog(tenantId, filter)
    },
    async companyExtras(tenantId) {
      await delay('settings.companyExtras')
      return settings.companyExtras(tenantId)
    },
    async setCompanyExtras(tenantId, actorUserId, input) {
      await delay('settings.setCompanyExtras')
      settings.setCompanyExtras(tenantId, actorUserId, input)
    },
    async exportAll(tenantId, actorUserId, texts) {
      await delay('settings.exportAll')
      return settings.exportAll(tenantId, actorUserId, texts)
    },
    async requestDeletion(tenantId, actorUserId) {
      await delay('settings.requestDeletion')
      settings.requestDeletion(tenantId, actorUserId)
    },
  },

  admin: { health: later('admin.health', 'E (admin, 03 §5 item 12)') },
}
