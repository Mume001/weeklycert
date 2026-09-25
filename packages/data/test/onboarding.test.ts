// The company profile and the wizard's progress (spec/03 §4.3, session H).
import { beforeEach, describe, expect, it } from 'vitest'
import { CompanyInputSchema, companyFormErrors } from '../src/dto/index.ts'
import { getRepositories } from '../src/index.ts'
import { resetMockDb } from '../src/mock/db.ts'

const repos = getRepositories()
const HUDSON = '01921000-0000-7000-8000-000000000001'
const RIVERSIDE = '01921000-0000-7000-8000-000000000002'

beforeEach(resetMockDb)

describe('step 1, the company', () => {
  it('never sends the FEIN back, only its last four', async () => {
    const dto = await repos.tenants.company(HUDSON)
    expect(dto.values.fein).toBe('')
    expect(dto.feinLast4).toBe('0000')
    expect(JSON.stringify(dto)).not.toContain('47-0000000')
  })

  it('saves the profile; an empty FEIN keeps the one on file', async () => {
    const dto = await repos.tenants.company(RIVERSIDE)
    const input = CompanyInputSchema.parse({
      ...dto.values,
      addressLine1: '5 River Rd',
      city: 'Newburgh',
      zip: '12550',
      fein: '12-3450000',
      nysRegistrationNumber: '1180001',
      nysRegistrationExpiresOn: '2027-06-30',
      defaultOurRole: 'sub_tier2',
    })
    expect(await repos.tenants.updateCompany(RIVERSIDE, input)).toEqual({ ok: true })
    expect((await repos.tenants.company(RIVERSIDE)).feinLast4).toBe('0000')
    await repos.tenants.updateCompany(RIVERSIDE, { ...input, fein: '' })
    const after = await repos.tenants.company(RIVERSIDE)
    expect(after.feinLast4).toBe('0000')
    expect(after.values).toMatchObject({
      nysRegistrationExpiresOn: '2027-06-30',
      defaultOurRole: 'sub_tier2',
    })
    // A new project starts with the company's usual role (04 default_our_role).
    expect((await repos.projects.form(RIVERSIDE, null))?.values.ourRole).toBe('sub_tier2')
  })

  it('checks the address, the ZIP and the FEIN', () => {
    const parsed = CompanyInputSchema.safeParse({
      legalName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      zip: '125',
      fein: '12-345',
      nysRegistrationNumber: '',
      nysRegistrationExpiresOn: '',
      defaultOurRole: 'sub',
      weekEndsOn: 6,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(companyFormErrors(parsed.error)).toEqual({
        legalName: 'legalNameRequired',
        zip: 'zipFormat',
        fein: 'feinFormat',
        addressLine1: 'addressRequired',
      })
    }
  })

  it('refuses a new week end once a project has a week', async () => {
    const dto = await repos.tenants.company(HUDSON)
    const result = await repos.tenants.updateCompany(
      HUDSON,
      CompanyInputSchema.parse({ ...dto.values, weekEndsOn: 5 }),
    )
    expect(result).toEqual({ ok: false, errors: { weekEndsOn: 'weekEndLocked' } })
    expect(dto.weekEndLocked).toBe(true)
    expect((await repos.tenants.company(RIVERSIDE)).weekEndLocked).toBe(false)
  })
})

describe('the progress', () => {
  it('moves forward only, and remembers a skipped step as a gap', async () => {
    expect(await repos.tenants.onboarding(RIVERSIDE)).toMatchObject({
      step: 1,
      skipped: [],
      inTrial: true,
      setupTier: null,
    })
    await repos.tenants.completeOnboardingStep(RIVERSIDE, 4, true)
    await repos.tenants.completeOnboardingStep(RIVERSIDE, 2, false)
    expect(await repos.tenants.onboarding(RIVERSIDE)).toMatchObject({ step: 4, skipped: [4] })
    // Doing the step later closes the gap.
    await repos.tenants.completeOnboardingStep(RIVERSIDE, 4, false)
    expect((await repos.tenants.onboarding(RIVERSIDE)).skipped).toEqual([])
  })

  it('says what step 1 still lacks, for the locked step (02 §5)', async () => {
    expect((await repos.tenants.onboarding(RIVERSIDE)).companyMissing).toEqual([
      'addressLine1',
      'fein',
      'nysRegistrationNumber',
    ])
    expect((await repos.tenants.onboarding(HUDSON)).companyMissing).toEqual([])
  })

  it('saves the setup tier of step 7', async () => {
    await repos.tenants.chooseSetupTier(RIVERSIDE, 'standard')
    expect((await repos.tenants.onboarding(RIVERSIDE)).setupTier).toBe('standard')
  })
})
