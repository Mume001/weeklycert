// The company profile and the onboarding progress over the fixtures
// (spec/03 §4.3, spec/04 tenants and tenant_settings). In the mock the FEIN is
// a plain string standing in for fein_encrypted; the screen only ever gets its
// last four.
import type {
  CompanyFormDTO,
  CompanyInput,
  CompanySaveResult,
  OnboardingDTO,
  SetupTier,
  Uuid,
} from '../dto/index.ts'
import { db } from './db.ts'

type TenantRow = (typeof db.tenants)[number]

function tenantOf(tenantId: Uuid): TenantRow {
  const t = db.tenants.find((x) => x.id === tenantId)
  if (!t) throw new Error(`Unknown tenant ${tenantId}`)
  return t
}

/** A project that has a week already fixes the week end (15 §3, projects form). */
function weekEndLocked(tenantId: Uuid): boolean {
  return db.periods.some((p) => p.tenantId === tenantId)
}

function valuesOf(t: TenantRow): CompanyFormDTO['values'] {
  return {
    legalName: t.legalName,
    addressLine1: t.addressLine1 ?? '',
    addressLine2: t.addressLine2 ?? '',
    city: t.city ?? '',
    zip: t.zip ?? '',
    fein: '',
    nysRegistrationNumber: t.nysRegistrationNumber ?? '',
    nysRegistrationExpiresOn: t.nysRegistrationExpiresOn ?? '',
    defaultOurRole: t.defaultOurRole,
    weekEndsOn: t.settings.weekEndingDow,
  }
}

export function companyForm(tenantId: Uuid): CompanyFormDTO {
  const t = tenantOf(tenantId)
  return {
    values: valuesOf(t),
    feinLast4: t.fein ? t.fein.slice(-4) : null,
    weekEndLocked: weekEndLocked(tenantId),
    weekEndsOn: t.settings.weekEndingDow,
  }
}

export function updateCompany(tenantId: Uuid, input: CompanyInput): CompanySaveResult {
  const t = tenantOf(tenantId)
  if (input.weekEndsOn !== t.settings.weekEndingDow && weekEndLocked(tenantId)) {
    return { ok: false, errors: { weekEndsOn: 'weekEndLocked' } }
  }
  const digits = input.fein.replace(/\D/g, '')
  Object.assign(t, {
    legalName: input.legalName,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 || null,
    city: input.city,
    zip: input.zip,
    fein: digits ? `${digits.slice(0, 2)}-${digits.slice(2)}` : t.fein,
    nysRegistrationNumber: input.nysRegistrationNumber || null,
    nysRegistrationExpiresOn: input.nysRegistrationExpiresOn || null,
    defaultOurRole: input.defaultOurRole,
  })
  t.settings.weekEndingDow = input.weekEndsOn
  return { ok: true }
}

/** Fields step 1 still lacks, for the locked step's "Still missing" (02 §5). */
function companyMissing(t: TenantRow): OnboardingDTO['companyMissing'] {
  const missing: OnboardingDTO['companyMissing'] = []
  if (!t.addressLine1 || !t.city || !t.zip) missing.push('addressLine1')
  if (!t.fein) missing.push('fein')
  if (!t.nysRegistrationNumber) missing.push('nysRegistrationNumber')
  return missing
}

export function onboarding(tenantId: Uuid): OnboardingDTO {
  const t = tenantOf(tenantId)
  return {
    step: t.onboardingStep,
    skipped: [...t.onboardingSkipped],
    inTrial: t.status === 'trial',
    setupTier: t.setupTier,
    companyMissing: companyMissing(t),
  }
}

/** A step done or skipped. The counter only moves forward; a skip is remembered as a gap. */
export function completeOnboardingStep(tenantId: Uuid, step: number, skipped: boolean): void {
  const t = tenantOf(tenantId)
  t.onboardingStep = Math.max(t.onboardingStep, step)
  const others = t.onboardingSkipped.filter((s) => s !== step)
  t.onboardingSkipped = skipped ? [...others, step].sort((a, b) => a - b) : others
}

export function chooseSetupTier(tenantId: Uuid, tier: SetupTier): void {
  tenantOf(tenantId).setupTier = tier
}
