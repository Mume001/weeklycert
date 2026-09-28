import { copy } from '@wc/copy'
import { AUDIT_KINDS, AuditFilterSchema, getRepositories } from '@wc/data'
import { ScrollText } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/patterns/EmptyState'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatClock, formatDate } from '@/lib/format'
import { settingsPage } from './SettingsFrame'

const t = copy.settings.audit

/**
 * /settings/audit (spec/03 §4.9): the company's log, with every read of a
 * worker's details (11 §5), filtered by person and kind, exported as CSV. The
 * owner and the administrator read it (02 §3); nobody changes it.
 */
export async function AuditScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string; userId?: string; kind?: string }
}) {
  const page = await settingsPage(slug, 'audit', search, 'admin')
  if ('done' in page) return page.done
  const { shell, forced, frame } = page.ctx
  const parsed = AuditFilterSchema.safeParse({
    userId: search.userId || undefined,
    kind: search.kind || undefined,
  })
  const filter = parsed.success ? parsed.data : {}
  const dto = await getRepositories().settings.auditLog(shell.tenant.id, filter)
  const rows = forced === 'empty' ? [] : dto.rows
  const base = `/app/${slug}/settings/audit`
  const csv = `/api/files/${encodeURIComponent(
    `audit:${filter.userId ?? ''}:${filter.kind ?? ''}`,
  )}?t=${encodeURIComponent(slug)}`

  return frame(
    <>
      <form
        action={base}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border-decorative bg-white p-4 shadow-sm"
      >
        <FormField id="audit-person" label={t.filters.person}>
          <select
            {...fieldIds('audit-person')}
            name="userId"
            defaultValue={filter.userId ?? ''}
            className={selectClass}
          >
            <option value="">{t.filters.everyone}</option>
            {dto.people.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="audit-kind" label={t.filters.kind}>
          <select
            {...fieldIds('audit-kind')}
            name="kind"
            defaultValue={filter.kind ?? ''}
            className={selectClass}
          >
            <option value="">{t.filters.allKinds}</option>
            {AUDIT_KINDS.map((k) => (
              <option key={k} value={k}>
                {t.kinds[k]}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="submit">{t.filters.show}</Button>
        <Button asChild variant="secondary" className="ml-auto">
          <a href={csv}>{t.export}</a>
        </Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t.empty}
          action={
            filter.userId || filter.kind ? (
              <Button asChild variant="secondary">
                <Link href={base}>{copy.archive.filters.clear}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.when}</TableHead>
                <TableHead>{t.columns.person}</TableHead>
                <TableHead>{t.columns.what}</TableHead>
                <TableHead>{t.columns.detail}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-testid="audit-row">
                  <TableCell className="tabular-nums">
                    {formatDate(r.at.slice(0, 10))}{' '}
                    <span className="text-xs text-text-secondary">{formatClock(r.at)}</span>
                  </TableCell>
                  <TableCell>{r.userName}</TableCell>
                  <TableCell>{t.kinds[r.kind]}</TableCell>
                  <TableCell className="whitespace-normal">
                    {r.action === 'support.end' ? t.supportEnded : r.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>,
  )
}
