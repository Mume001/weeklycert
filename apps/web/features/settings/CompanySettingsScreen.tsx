import { copy } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { Notice } from '@/components/patterns/Notice'
import { COMPANY_WRITERS } from '@/lib/session'
import { CompanyExtrasForm } from './CompanyExtrasForm'
import { CompanyStep } from './CompanyStep'
import { settingsPage } from './SettingsFrame'

/**
 * /settings/company (spec/03 §4.9): everything of onboarding step 1, plus the
 * time zone and the logo. Every member reads it; the owner and the
 * administrator change it (spec/02 §3).
 */
export async function CompanySettingsScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string; saved?: string }
}) {
  const page = await settingsPage(slug, 'company', search, 'admin')
  if ('done' in page) return page.done
  const { shell, forced, paused, frame } = page.ctx
  const readOnly = paused || !COMPANY_WRITERS.includes(shell.role)
  const extras = await getRepositories().settings.companyExtras(shell.tenant.id)
  const here = `/app/${slug}/settings/company`

  return frame(
    <>
      {search.saved === '1' && <Notice tone="info" title={copy.settings.company.saved} />}
      {!COMPANY_WRITERS.includes(shell.role) && (
        <p className="text-sm text-text-secondary">{copy.settings.company.readOnly}</p>
      )}
      <CompanyStep
        slug={slug}
        tenantId={shell.tenant.id}
        readOnly={readOnly}
        emptied={forced === 'empty'}
        nextHref={`${here}?saved=1`}
        submitLabel={copy.buttons.save}
      />
      <CompanyExtrasForm
        slug={slug}
        timezone={extras.timezone}
        logo={forced === 'empty' ? null : extras.logo}
        readOnly={readOnly}
      />
    </>,
  )
}
