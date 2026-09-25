// Session H acceptance (spec/20 H, spec/03 §4.3, spec/02 §5, spec/19 §10): the
// onboarding wizard on the fixtures. Hudson has finished it; Riverside is on
// its trial at step 1, and the bookkeeper is the demo user who belongs to both.
//
// Tests that write make their own project (draft, so "This week" is untouched)
// or write back what was there, so a second run finds the fixtures as they were.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const RIVERSIDE = '/app/riverside-mechanical'

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`)
  })
  return errors
}

async function expectNoSeriousA11y(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

async function switchRole(page: Page, role: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitemradio', { name: role }).click()
  await expect(page.getByRole('button', { name: `Viewing as ${role}` })).toBeVisible()
}

const current = (page: Page) =>
  page.locator('nav[aria-label="Setup progress"] [aria-current="step"]')

test.describe('the wizard, as the owner of Hudson', () => {
  test('a finished setup opens on its end; step 1 keeps the FEIN on the server', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/onboarding`)
    await expect(page.getByText('Setup is complete.')).toBeVisible()

    await page.goto(`${APP}/onboarding?step=1`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Setup\s*Step 1 of 7/)
    await expect(page.getByLabel('Legal name')).toHaveValue('Hudson Electric LLC')
    await expect(page.getByLabel('FEIN')).toHaveValue('')
    await expect(page.getByText(/On file, ending in 0000\./)).toBeVisible()
    // A project has weeks, so the week end is fixed (15 §3).
    await expect(page.getByLabel('Weeks end on')).toBeDisabled()
    await page.screenshot({ path: '../../docs/screens/app-t-onboarding.png', fullPage: true })
    await expectNoSeriousA11y(page)

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(current(page)).toContainText('First project')
    expect(errors).toEqual([])
  })

  test('Skip for now on steps 4 and 5 only; step 7 has none once the trial is over', async ({
    page,
  }) => {
    for (const [step, skip] of [
      [1, false],
      [2, false],
      [3, false],
      [4, true],
      [5, true],
      [6, false],
      [7, false],
    ] as const) {
      await page.goto(`${APP}/onboarding?step=${step}`)
      await expect(current(page)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Skip for now' })).toHaveCount(skip ? 1 : 0)
    }
    await page.goto(`${APP}/onboarding?step=4`)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(current(page)).toContainText('Fringe plans')
  })

  test('step 3: rows pasted from a wage schedule are suggested, then added once confirmed', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    // A draft project of its own, so the seeded projects keep their rates.
    await page.goto(`${APP}/projects/new`)
    await page.getByLabel('Project name').fill(`Paste ${Date.now()}`)
    await page.getByLabel('PRC number').fill(String(Date.now()).slice(-10))
    await page.getByLabel('Start date').fill('2026-08-31')
    await page.getByLabel('Status', { exact: true }).selectOption('draft')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/)
    const projectId = page.url().split('/').pop() ?? ''

    await page.goto(`${APP}/onboarding?step=3&project=${projectId}`)
    await page.getByRole('button', { name: 'Paste a table from the wage schedule' }).click()
    await page
      .getByLabel('Rows copied from the wage schedule')
      .fill(
        [
          'Electrician - Inside Wireman\t$63.20\t$52.45\tA, W',
          'Plumber - Journeyman\t60.00\t40.00\tA',
          'Laborer – Group 1\t40.00\t30.00',
        ].join('\n'),
      )
    await page.getByRole('button', { name: 'Suggest rows' }).click()
    const rows = page.locator('tbody tr')
    await expect(rows.nth(0)).toContainText('Electrician – Inside Wireman')
    await expect(rows.nth(0)).toContainText('Ready')
    await expect(rows.nth(1)).toContainText('Not on the official NY list')
    await expect(rows.nth(2)).toContainText('No OT codes on this line')
    await expectNoSeriousA11y(page)

    // Nothing is saved before the confirmation.
    await page.getByLabel('Effective from').fill('2026-08-30')
    await page.getByRole('button', { name: 'Add 1 classification' }).click()
    await expect(page.getByText('1 classification added.')).toBeVisible()

    await page.goto(`${APP}/projects/${projectId}/classifications`)
    const added = page.locator('tbody tr').filter({ hasText: 'Electrician – Inside Wireman' })
    await expect(added).toContainText('$63.20')
    await expect(added).toContainText('Pasted from the schedule')
    expect(errors).toEqual([])
  })

  test('step 6 opens the grid on the week picked', async ({ page }) => {
    await page.goto(`${APP}/onboarding?step=6`)
    await page.getByLabel('Week ending').selectOption('2026-09-12')
    await page.getByRole('button', { name: 'Open the grid' }).click()
    await expect(page).toHaveURL(/\/weeks\/2026-09-12$/)
  })

  test('step 7 saves the tier and ends the wizard, without Stripe', async ({ page }) => {
    await page.goto(`${APP}/onboarding?step=7`)
    await expect(
      page.getByText('Payment is not connected in this demo. Your choice is saved.'),
    ).toBeVisible()
    await page.getByLabel(/^Standard/).check()
    await expectNoSeriousA11y(page)
    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await expect(page.getByText('Setup is complete.')).toBeVisible()
    await page.getByRole('link', { name: 'Go to the dashboard' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})

test.describe('locked steps (02 §5)', () => {
  test('payroll reads step 1 and step 7, and is told who enters them', async ({ page }) => {
    await page.goto(`${APP}/onboarding?step=1`)
    await switchRole(page, 'Payroll')
    await page.goto(`${APP}/onboarding?step=1`)
    await expect(
      page.getByText(
        'Only the owner or an administrator can enter the company profile. Ask Mirza Hodzic.',
      ),
    ).toBeVisible()
    await expect(page.getByLabel('Legal name')).toBeDisabled()
    await page.goto(`${APP}/onboarding?step=7`)
    await expect(
      page.getByText('Only the owner can choose how to pay. Ask Mirza Hodzic.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue to payment' })).toHaveCount(0)
    await switchRole(page, 'Owner')
  })

  test('the administrator enters step 1 but not step 7', async ({ page }) => {
    await page.goto(`${APP}/onboarding?step=1`)
    await switchRole(page, 'Administrator')
    await page.goto(`${APP}/onboarding?step=1`)
    await expect(page.getByLabel('Legal name')).toBeEnabled()
    await page.goto(`${APP}/onboarding?step=7`)
    await expect(page.getByText(/^Only the owner can choose how to pay\./)).toBeVisible()
    await switchRole(page, 'Owner')
  })

  test('the viewer has no setup', async ({ page }) => {
    await page.goto(`${APP}/onboarding`)
    await switchRole(page, 'Viewer')
    await page.goto(`${APP}/onboarding`)
    await expect(page.getByText('You do not have access to this page.')).toBeVisible()
    await switchRole(page, 'Owner')
  })
})

test('Riverside: step 1 says what is missing, and the wizard resumes where it was left', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto(`${APP}/onboarding`)
  await switchRole(page, 'Bookkeeper')
  await page.goto(`${RIVERSIDE}/onboarding?step=1`)
  await expect(current(page)).toContainText('Company')
  await expect(
    page.getByText('Still missing: Address line 1, FEIN, NYS contractor registration number.'),
  ).toBeVisible()
  // Step 7 is the owner's: locked for the bookkeeper, so no skip either, trial or not.
  await page.goto(`${RIVERSIDE}/onboarding?step=7`)
  await expect(page.getByRole('button', { name: 'Skip for now' })).toHaveCount(0)

  // Step 2: the first project, then Continue. Leaving and coming back opens step 3.
  await page.goto(`${RIVERSIDE}/onboarding?step=2`)
  const name = page.getByLabel('Project name')
  if ((await name.inputValue()) === '') {
    await name.fill('Riverside first job')
    await page.getByLabel('PRC number').fill(String(Date.now()).slice(-10))
    await page.getByLabel('Start date').fill('2026-08-31')
    await page.getByLabel('Status', { exact: true }).selectOption('draft')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page).toHaveURL(/project=[0-9a-f-]{36}/)
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(current(page)).toContainText('Classifications')
  await page.goto(`${RIVERSIDE}/dashboard`)
  await page.goto(`${RIVERSIDE}/onboarding`)
  await expect(current(page)).toContainText('Classifications')

  await page.goto(`${APP}/onboarding`)
  await switchRole(page, 'Owner')
  expect(errors).toEqual([])
})

test('loading, empty, error, forbidden and locked from ?state=', async ({ page }) => {
  const url = `${APP}/onboarding`
  await page.goto(`${url}?state=loading`)
  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
  await page.goto(`${url}?state=error`)
  await expect(page.getByText('This did not load.')).toBeVisible()
  await expect(page.getByText('Reference req_2f9a1c')).toBeVisible()
  await page.goto(`${url}?state=forbidden`)
  await expect(page.getByText('You do not have access to this page.')).toBeVisible()
  await page.goto(`${url}?state=locked&step=4`)
  await expect(page.getByText(/^Paused\. You can read and export everything\./)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Skip for now' })).toHaveCount(0)
  await page.goto(`${url}?state=empty`)
  await expect(current(page)).toContainText('Company')
  await expect(page.getByLabel('Legal name')).toHaveValue('')
})
