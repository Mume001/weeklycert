// The dashboard over the fixtures (spec/03 §4.3): "what is on fire this week",
// in three seconds. Every date is counted from the mock's today (spec/19 §4);
// the rules are core's (the 30 days of 05 §2, the grace, the WH-347 of 01
// §2.9), and the weeks are the ones the projects screen shows, so the two
// screens never disagree.
import {
  daysBetween,
  federalDueDate,
  lastEndedWeekEnding,
  payDateOf,
  stateDeadlineLevel,
} from '@wc/core'
import type { DashboardDTO, FirmNextDTO, IsoDate, TimelineWeek, Uuid } from '../dto/index.ts'
import { statusOf } from './archive.ts'
import { mockToday } from './clock.ts'
import { db, NY_PORTAL, WH347 } from './db.ts'
import { nextDeadline, weeksOf } from './projects.ts'

type ProjectRow = (typeof db.projects)[number]

const RECENT = 5

/** A week that still owes its NYSDOL filing: not submitted, or submitted and refused. */
const unfiled = (w: TimelineWeek) =>
  !w.isNoWork && (w.status !== 'submitted' || w.displayStatus === 'rejected')

/**
 * A week that still owes its WH-347: only a WH-347 sent to the agency or the
 * general contractor closes it, never the NYSDOL filing (spec/04 submissions).
 */
const wh347Due = (w: TimelineWeek) =>
  !w.isNoWork && !db.submissions.some((s) => s.periodId === w.periodId && s.channel === WH347)

/** NY rates are published for a year from 1 July (03 §4.3 point 4). */
function lastJulyFirst(today: IsoDate): IsoDate {
  const year = Number(today.slice(0, 4))
  return today >= `${year}-07-01` ? `${year}-07-01` : `${year - 1}-07-01`
}

function healthOf(tenantId: Uuid, projects: ProjectRow[], today: IsoDate) {
  const workers = db.workers.filter((w) => w.tenantId === tenantId && w.status === 'active')
  const july = lastJulyFirst(today)
  let expired = 0
  for (const p of projects) {
    const rows = db.projectClassifications.filter((c) => c.projectId === p.id)
    for (const id of new Set(rows.map((r) => r.classificationId))) {
      const newest = rows
        .filter((r) => r.classificationId === id)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
      if (newest && (newest.effectiveFrom < july || (newest.effectiveTo ?? today) < today)) {
        expired++
      }
    }
  }
  const counts = {
    worker_no_classification: workers.filter((w) => w.defaultClassificationId === null).length,
    project_no_prc: projects.filter((p) => p.prcNumber === null).length,
    rate_expired: expired,
    apprentice_unregistered: workers.filter(
      (w) =>
        w.level === 'RA' &&
        !db.apprenticeRecords.some(
          (a) =>
            // The same test as the engine's APPRENTICE_NO_RECORD and _EXPIRED (spec/07).
            a.workerId === w.id && a.validFrom <= today && (a.validTo ?? today) >= today,
        ),
    ).length,
  }
  return (Object.entries(counts) as [DashboardDTO['healthIssues'][number]['kind'], number][])
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, count }))
}

export function dashboard(tenantId: Uuid): DashboardDTO {
  const today = mockToday()
  const tenant = db.tenants.find((t) => t.id === tenantId)
  if (!tenant) throw new Error(`Unknown tenant ${tenantId}`)
  const all = db.projects.filter((p) => p.tenantId === tenantId)
  const active = all
    .filter((p) => p.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))
  const current = lastEndedWeekEnding(today, tenant.settings.weekEndingDow)
  const weeks = new Map(active.map((p) => [p.id, weeksOf(p, true)]))
  const weeksOfProject = (p: ProjectRow) => weeks.get(p.id) ?? []

  const deadlines = active
    .flatMap((p) => {
      const dueOn = nextDeadline(p)
      if (!dueOn) return []
      const daysLeft = daysBetween(today, dueOn)
      return [
        {
          projectId: p.id,
          projectName: p.name,
          prcNumber: p.prcNumber,
          lastAcceptedAt: p.lastAcceptedSubmissionAt,
          dueOn,
          daysLeft,
          level: stateDeadlineLevel(daysLeft),
          unfiledWeeks: weeksOfProject(p)
            .filter(unfiled)
            .map((w) => w.weekEnding),
        },
      ]
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.projectName.localeCompare(b.projectName))

  const federal = active
    .filter((p) => p.federalReporting)
    .flatMap((p) =>
      weeksOfProject(p)
        .filter(wh347Due)
        .map((w) => {
          const row = w.periodId ? db.periods.find((x) => x.id === w.periodId) : undefined
          const pay = payDateOf(w.weekEnding, tenant.settings.payLagDays, row?.payDate ?? null)
          const dueOn = federalDueDate(pay.date)
          return {
            projectId: p.id,
            projectName: p.name,
            weekEnding: w.weekEnding,
            payDate: pay.date,
            payDateSource: pay.source,
            dueOn,
            daysLeft: daysBetween(today, dueOn),
          }
        }),
    )
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))

  const openWeeks = active
    .flatMap((p) =>
      weeksOfProject(p)
        .filter((w) => !w.locked && !w.isNoWork)
        .map((w) => ({
          projectId: p.id,
          projectName: p.name,
          weekEnding: w.weekEnding,
          displayStatus: w.displayStatus,
          noEntries: w.noEntries,
          hard: w.findings.hard,
          soft: w.findings.soft,
        })),
    )
    .sort(
      (a, b) =>
        a.weekEnding.localeCompare(b.weekEnding) || a.projectName.localeCompare(b.projectName),
    )

  const missingWeeks = active.flatMap((p) => {
    const week = weeksOfProject(p).find((w) => w.weekEnding === current)
    return week?.noEntries ? [{ projectId: p.id, projectName: p.name, weekEnding: current }] : []
  })

  const signatureQueue = active
    .flatMap((p) =>
      weeksOfProject(p)
        .filter((w) => w.status === 'generated')
        .map((w) => ({ projectId: p.id, projectName: p.name, weekEnding: w.weekEnding })),
    )
    .sort((a, b) => a.weekEnding.localeCompare(b.weekEnding))

  const year = today.slice(0, 4)
  const accepted = db.submissions.filter(
    (s) =>
      s.tenantId === tenantId &&
      s.channel === NY_PORTAL &&
      s.outcome === 'accepted' &&
      (s.outcomeAt ?? s.submittedAt).startsWith(year),
  ).length

  const recentReports = db.reports
    .filter((r) => r.tenantId === tenantId && r.kind === 'ny_xml')
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt) || b.version - a.version)
    .flatMap((r) => {
      const period = db.periods.find((x) => x.id === r.periodId)
      const project = period && all.find((p) => p.id === period.projectId)
      if (!period || !project) return []
      return [
        {
          reportId: r.id,
          projectId: project.id,
          projectName: project.name,
          weekEnding: period.weekEnding,
          version: r.version,
          status: r.signedAt === null ? ('draft' as const) : statusOf(r),
        },
      ]
    })
    .slice(0, RECENT)

  return {
    isNew: all.length === 0,
    cards: {
      projectsPastDeadline: deadlines.filter((d) => d.daysLeft < 0).length,
      weeksWaitingForHours: openWeeks.filter((w) => w.noEntries).length,
      reportsWaitingForSignature: signatureQueue.length,
      filingsAcceptedThisYear: accepted,
    },
    signatureQueue,
    deadlines,
    federal,
    openWeeks,
    missingWeeks,
    recentReports,
    healthIssues: healthOf(
      tenantId,
      all.filter((p) => p.status === 'active' || p.status === 'draft'),
      today,
    ),
  }
}

/** The nearest NY deadline of the company, for /firms (03 §4.2). */
export function firmNext(tenantId: Uuid): FirmNextDTO {
  const today = mockToday()
  const nearest = db.projects
    .filter((p) => p.tenantId === tenantId && p.status === 'active')
    .flatMap((p) => {
      const dueOn = nextDeadline(p)
      return dueOn ? [{ p, dueOn }] : []
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.p.name.localeCompare(b.p.name))[0]
  if (!nearest) return null
  const daysLeft = daysBetween(today, nearest.dueOn)
  return {
    projectName: nearest.p.name,
    dueOn: nearest.dueOn,
    daysLeft,
    level: stateDeadlineLevel(daysLeft),
    weekStatus: weeksOf(nearest.p, true).at(-1)?.displayStatus ?? null,
  }
}
