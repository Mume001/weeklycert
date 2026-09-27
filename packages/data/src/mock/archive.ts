// The archive over the fixtures (spec/03 §4.8): every signed version of every
// week, with what happened to it. One row is one version; the filters are the
// ones an auditor asks with ("everything for PRC 2010008390 in 2026").
import type { ArchiveDTO, ArchiveFilter, ArchiveRowDTO, ArchiveStatus, Uuid } from '../dto/index.ts'
import { db } from './db.ts'
import { SAMPLE_NY_XML } from './fixtures/sample-ny-payroll.ts'
import { storedZip } from './zip.ts'

type ReportRow = (typeof db.reports)[number]

function statusOf(r: ReportRow): ArchiveStatus {
  if (r.status === 'superseded') return 'corrected'
  const submission = db.submissions.find((s) => s.reportId === r.id)
  if (submission?.outcome === 'rejected') return 'rejected'
  return submission ? 'submitted' : 'signed'
}

/** Every signed NY version of the company, newest week first, newest version first. */
function allRows(tenantId: Uuid): ArchiveRowDTO[] {
  return db.reports
    .filter((r) => r.tenantId === tenantId && r.kind === 'ny_xml' && r.signedAt !== null)
    .flatMap((r): ArchiveRowDTO[] => {
      const period = db.periods.find((p) => p.id === r.periodId)
      const project = period && db.projects.find((p) => p.id === period.projectId)
      if (!period || !project) return []
      const submission = db.submissions.find((s) => s.reportId === r.id)
      return [
        {
          reportId: r.id,
          projectId: project.id,
          projectName: project.name,
          prcNumber: project.prcNumber,
          weekEnding: period.weekEnding,
          payrollNumber: period.payrollNumber,
          version: r.version,
          status: statusOf(r),
          signerName: db.signers.find((s) => s.id === r.signedBySignerId)?.fullName ?? null,
          submittedAt: submission?.submittedAt ?? null,
          confirmationRef: submission?.confirmationRef ?? null,
          // One example file per version, named as the reports screen names it (spec/19 §11).
          files: [
            {
              id: `${r.id}:ny_xml`,
              name: `EXAMPLE_${project.prcNumber ?? 'NY'}_${period.weekEnding}_v${r.version}.xml`,
            },
          ],
        },
      ]
    })
    .sort(
      (a, b) =>
        b.weekEnding.localeCompare(a.weekEnding) ||
        a.projectName.localeCompare(b.projectName) ||
        b.version - a.version,
    )
}

/** The weeks a worker whose name holds the text worked in, as "project|week ending". */
function weeksOfWorker(tenantId: Uuid, text: string): Set<string> {
  const q = text.trim().toLowerCase()
  const ids = new Set(
    db.workers
      .filter((w) => w.tenantId === tenantId)
      .filter((w) =>
        [`${w.lastName}, ${w.firstName}`, `${w.firstName} ${w.lastName}`].some((n) =>
          n.toLowerCase().includes(q),
        ),
      )
      .map((w) => w.id),
  )
  const out = new Set<string>()
  for (const e of db.timeEntries) {
    if (!ids.has(e.workerId) || !e.days.some((d) => d !== null)) continue
    const period = db.periods.find((p) => p.id === e.periodId)
    if (period) out.add(`${period.projectId}|${period.weekEnding}`)
  }
  return out
}

export function listArchive(tenantId: Uuid, filter: ArchiveFilter = {}): ArchiveDTO {
  const every = allRows(tenantId)
  const latest = new Map<string, number>()
  for (const r of every) {
    const key = `${r.projectId}|${r.weekEnding}`
    latest.set(key, Math.max(latest.get(key) ?? 0, r.version))
  }
  const query = filter.query?.trim().toLowerCase() ?? ''
  const worker = filter.worker?.trim() ? weeksOfWorker(tenantId, filter.worker) : null
  const rows = every.filter(
    (r) =>
      (!filter.projectId || r.projectId === filter.projectId) &&
      (!filter.year || r.weekEnding.startsWith(String(filter.year))) &&
      (!filter.status || r.status === filter.status) &&
      (filter.versions !== 'latest' ||
        latest.get(`${r.projectId}|${r.weekEnding}`) === r.version) &&
      (!worker || worker.has(`${r.projectId}|${r.weekEnding}`)) &&
      (!query ||
        (r.prcNumber ?? '').toLowerCase().includes(query) ||
        r.projectName.toLowerCase().includes(query)),
  )
  const projects = new Map(every.map((r) => [r.projectId, r]))
  const shown = new Set(rows.map((r) => r.projectId))
  return {
    rows,
    projects: [...projects.values()]
      .map((r) => ({ id: r.projectId, name: r.projectName, prcNumber: r.prcNumber }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    years: [...new Set(every.map((r) => Number(r.weekEnding.slice(0, 4))))].sort((a, b) => b - a),
    exportProjectId:
      filter.projectId && projects.has(filter.projectId)
        ? filter.projectId
        : shown.size === 1
          ? ([...shown][0] ?? null)
          : null,
  }
}

const csvCell = (c: string) => (/[",\r\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)

/**
 * "Export everything for this project" in the mock phase (spec/20 J): a zip
 * built from the fixtures and named EXAMPLE, holding a note that says so, the
 * summary of every filed version as CSV, and one example XML per version. In
 * step 5 it holds the real PDFs and XMLs. The words come in from packages/copy.
 */
export function exportArchive(
  tenantId: Uuid,
  projectId: Uuid,
  texts: { readme: string; headers: string[]; statuses: Record<ArchiveStatus, string> },
): { name: string; contentType: string; body: Uint8Array<ArrayBuffer> } | null {
  const project = db.projects.find((p) => p.id === projectId && p.tenantId === tenantId)
  if (!project) return null
  const rows = allRows(tenantId).filter((r) => r.projectId === projectId)
  const encoder = new TextEncoder()
  const summary = [
    texts.headers,
    ...rows.map((r) => [
      r.weekEnding,
      r.payrollNumber === null ? '' : String(r.payrollNumber),
      String(r.version),
      texts.statuses[r.status],
      r.signerName ?? '',
      r.submittedAt?.slice(0, 10) ?? '',
      r.confirmationRef ?? '',
    ]),
  ]
    .map((line) => line.map(csvCell).join(','))
    .join('\r\n')
  const prc = project.prcNumber ?? 'NY'
  return {
    name: `EXAMPLE_weeklycert-archive-${prc}.zip`,
    contentType: 'application/zip',
    body: storedZip([
      { name: 'EXAMPLE_README.txt', body: encoder.encode(`${texts.readme}\r\n`) },
      { name: `EXAMPLE_summary-${prc}.csv`, body: encoder.encode(`${summary}\r\n`) },
      ...rows.map((r) => ({
        name: r.files[0]?.name ?? `EXAMPLE_${r.weekEnding}_v${r.version}.xml`,
        body: encoder.encode(SAMPLE_NY_XML),
      })),
    ]),
  }
}
