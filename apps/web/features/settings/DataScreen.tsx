import { copy, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { Notice } from '@/components/patterns/Notice'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { DeleteCompany } from './DataForms'
import { settingsPage } from './SettingsFrame'

const t = copy.settings.data

/**
 * /settings/data (spec/03 §4.9): export everything, and ask to delete the
 * company. The owner alone (02 §3); both work in a paused or cancelled
 * company too, since that is when they are needed.
 */
export async function DataScreen({ slug, search }: { slug: string; search: { state?: string } }) {
  const page = await settingsPage(slug, 'data', search, 'owner')
  if ('done' in page) return page.done
  const { shell, frame } = page.ctx
  const billing = await getRepositories().settings.billing(shell.tenant.id)
  const exportHref = `/api/files/export%3Aall?t=${encodeURIComponent(slug)}`

  return frame(
    <>
      <section
        aria-labelledby="export-title"
        className="grid max-w-[880px] gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
      >
        <h2 id="export-title" className="text-md font-semibold text-text-primary">
          {t.export.title}
        </h2>
        <p className="text-sm text-text-secondary">{t.export.body}</p>
        <p className="text-xs text-text-secondary">{t.export.demo}</p>
        <div>
          <Button asChild>
            <a href={exportHref}>{t.export.action}</a>
          </Button>
        </div>
      </section>
      <section
        aria-labelledby="delete-title"
        className="grid max-w-[880px] gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
      >
        <h2 id="delete-title" className="text-md font-semibold text-text-primary">
          {t.delete.title}
        </h2>
        {billing.purgeAfter ? (
          <Notice
            tone="warning"
            title={fill(t.delete.scheduled, { date: formatDate(billing.purgeAfter) })}
          />
        ) : (
          <>
            <p className="text-sm text-text-secondary">{t.delete.body}</p>
            <p className="text-sm font-semibold text-n-800">{t.delete.retention}</p>
            <DeleteCompany slug={slug} companyName={shell.tenant.legalName} />
          </>
        )}
      </section>
    </>,
  )
}
