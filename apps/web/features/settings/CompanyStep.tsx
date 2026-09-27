import { getRepositories } from '@wc/data'
import { CompanyForm } from './CompanyForm'

/**
 * The company profile, loaded: onboarding step 1 (through the onboarding page,
 * spec/19 §2) and the top of /settings/company.
 */
export async function CompanyStep({
  slug,
  tenantId,
  readOnly,
  emptied = false,
  nextHref,
  submitLabel,
}: {
  slug: string
  tenantId: string
  readOnly: boolean
  /** ?state=empty in the wizard: a company with nothing filled in (spec/19 §7). */
  emptied?: boolean
  nextHref: string
  submitLabel?: string
}) {
  const company = await getRepositories().tenants.company(tenantId)
  return (
    <CompanyForm
      slug={slug}
      form={
        emptied
          ? { ...company, values: { ...company.values, legalName: '' }, feinLast4: null }
          : company
      }
      readOnly={readOnly}
      nextHref={nextHref}
      submitLabel={submitLabel}
    />
  )
}
