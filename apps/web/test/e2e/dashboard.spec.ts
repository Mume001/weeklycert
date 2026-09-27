// Session K acceptance (spec/20 K, spec/03 §4.2 and §4.3, spec/19 §10): the
// dashboard, /firms and /app on the fixture data, today being 15 September 2026.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const DASHBOARD = `${APP}/dashboard`
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const KINGSTON = '01924000-0000-7000-8000-000000000002'

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

test('what is on fire this week, with no console or a11y errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto(DASHBOARD)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tuesday, September 15')

  // One week, so the singular (15 §1 rule 11).
  await expect(page.getByText('week waiting for hours', { exact: true })).toBeVisible()
  await expect(page.getByText('filings accepted this year')).toBeVisible()
  // Nothing waits for a signature in the fixtures, so the card is not a link.
  await expect(page.getByRole('link', { name: /report waiting for signature/ })).toHaveCount(0)

  const deadlines = page.getByTestId('deadline-row')
  await expect(deadlines).toHaveCount(2)
  await expect(deadlines.nth(0)).toContainText('Dutchess County Courthouse Lighting')
  await expect(deadlines.nth(0)).toContainText('10 days left')
  await expect(deadlines.nth(1)).toContainText('17 days left')

  // The federal project's third row: the WH-347, 7 days after the pay date (01 §2.9).
  const federal = page.getByTestId('federal-row')
  await expect(federal).toHaveCount(2)
  await expect(federal.nth(0)).toContainText('W/E Sep 5 · paid Sep 11')
  await expect(federal.nth(0)).toContainText('Pay date from the company setting')
  await expect(federal.nth(0)).toContainText('3 days left')

  await expect(page.getByTestId('open-week-row')).toHaveCount(3)
  await expect(page.getByTestId('missing-row')).toHaveText([/Kingston WTP Electrical Upgrade/])
  await expect(page.getByTestId('recent-row')).toHaveCount(5)
  await expect(page.getByTestId('health-row')).toHaveText(['1 classification with an expired rate'])

  // Everything fits at 1280 px (spec/19 §10: measured, not guessed).
  await page.setViewportSize({ width: 1280, height: 900 })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
  await page.screenshot({ path: '../../docs/screens/app-t-dashboard.png', fullPage: true })
  await expectNoSeriousA11y(page)
  expect(errors).toEqual([])
})

test('the main action: open a week to close, by keyboard', async ({ page }) => {
  await page.goto(DASHBOARD)
  const kingston = page.getByTestId('open-week-row').filter({ hasText: 'Kingston' })
  const open = kingston.getByRole('link', { name: 'Open week' })
  await open.focus()
  await expect(open).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`${APP}/projects/${KINGSTON}/weeks/2026-09-12`)
})

test('the pay date of a week: the company setting, or one entered on the review', async ({
  page,
}) => {
  // A week with hours; the week without any is the next test.
  const review = `${APP}/projects/${DUTCHESS}/weeks/2026-09-12/review`
  await page.goto(review)
  const field = page.getByLabel('Pay date')
  // Saturday 12 September plus the company's 6 days (04 tenant_settings.pay_lag_days).
  await expect(field).toHaveValue('2026-09-18')
  await expect(page.getByText(/^From the company setting\./)).toBeVisible()
  await field.fill('2026-09-17')
  await page.getByRole('button', { name: 'Save pay date' }).click()
  await expect(page.getByText('Pay date saved.')).toBeVisible()
  await expect(page.getByText('Entered for this week.')).toBeVisible()

  // Back to the company setting, as the fixtures had it.
  await page.getByRole('button', { name: 'Use the company setting' }).click()
  await expect(page.getByText(/^From the company setting\./)).toBeVisible()
  await expect(field).toHaveValue('2026-09-18')
})

test('a week without hours takes a pay date too, and the dashboard says where it came from', async ({
  page,
}) => {
  const review = `${APP}/projects/${KINGSTON}/weeks/2026-09-12/review`
  await page.goto(review)
  await expect(page.getByText(/^No hours yet for this week\./)).toBeVisible()
  await page.getByLabel('Pay date').fill('2026-09-16')
  await page.getByRole('button', { name: 'Save pay date' }).click()
  await expect(page.getByText('Pay date saved.')).toBeVisible()

  await page.goto(DASHBOARD)
  const row = page.getByTestId('federal-row').filter({ hasText: 'W/E Sep 12' })
  await expect(row).toContainText('paid Sep 16')
  await expect(row).toContainText('Pay date entered for this week')
  await expect(row).toContainText('8 days left')

  // Back to the company setting, as the fixtures had it.
  await page.goto(review)
  await page.getByRole('button', { name: 'Use the company setting' }).click()
  await expect(page.getByText(/^From the company setting\./)).toBeVisible()
})

test('the viewer reads the dashboard, and gets "Open week" in place of "Enter hours"', async ({
  page,
}) => {
  await page.goto(DASHBOARD)
  await switchRole(page, 'Viewer')
  await expect(page.getByTestId('deadline-row')).toHaveCount(2)
  const missing = page.getByTestId('missing-row')
  await expect(missing.getByRole('link', { name: 'Enter hours' })).toHaveCount(0)
  await expect(missing.getByRole('link', { name: 'Open week' })).toBeVisible()
  await switchRole(page, 'Owner')
})

test('loading, empty, error, forbidden and locked from ?state=', async ({ page }) => {
  await page.goto(`${DASHBOARD}?state=loading`)
  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
  await page.goto(`${DASHBOARD}?state=error`)
  await expect(page.getByText('This did not load.')).toBeVisible()
  await page.goto(`${DASHBOARD}?state=forbidden`)
  await expect(page.getByText('You do not have access to this page.')).toBeVisible()
  await page.goto(`${DASHBOARD}?state=locked`)
  await expect(page.getByText(/^Paused\. You can read and export everything\./)).toBeVisible()
  await expect(page.getByTestId('deadline-row')).toHaveCount(2)
  await page.goto(`${DASHBOARD}?state=empty`)
  await expect(page.getByText('Start here')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start setup' })).toHaveAttribute(
    'href',
    `${APP}/onboarding`,
  )
})

test('/firms: every company, the nearest deadline first, and Open goes in', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto(DASHBOARD)
  await switchRole(page, 'Bookkeeper')
  await page.goto('/firms')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your companies')
  const cards = page.getByTestId('firm-card')
  await expect(cards).toHaveCount(2)
  // Hudson has a deadline in 10 days; Riverside has no project, so none, and goes last.
  await expect(cards.nth(0)).toContainText('Hudson Electric LLC')
  await expect(cards.nth(0)).toContainText('Dutchess County Courthouse Lighting, Sep 25, 2026')
  await expect(cards.nth(0)).toContainText('10 days left')
  await expect(cards.nth(1)).toContainText('Riverside Mechanical LLC')
  await expect(cards.nth(1)).toContainText('No filing due')
  await page.screenshot({ path: '../../docs/screens/firms.png', fullPage: true })
  await expectNoSeriousA11y(page)

  await cards.nth(1).getByRole('link', { name: 'Open' }).click()
  await expect(page).toHaveURL('/app/riverside-mechanical/dashboard')
  // A company with no project yet is one card that leads into the setup (03 §4.3).
  await expect(page.getByText('Start here')).toBeVisible()
  await page.goto(DASHBOARD)
  await switchRole(page, 'Owner')
  expect(errors).toEqual([])

  await page.goto('/firms?state=empty')
  await expect(
    page.getByText('You have no company yet. Create your own, or wait for an invitation.'),
  ).toBeVisible()
})

test('/app goes to the only company, or to /firms when there are more', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(DASHBOARD)
  await switchRole(page, 'Bookkeeper')
  await page.goto('/app')
  await expect(page).toHaveURL('/firms')
  await page.goto(DASHBOARD)
  await switchRole(page, 'Owner')
})

// Last in the file: it leaves Kingston's 5 September WH-347 recorded.
test('a WH-347 sent closes the federal row, and leaves the NYSDOL week open', async ({ page }) => {
  await page.goto(`${APP}/projects/${KINGSTON}/weeks/2026-09-05/reports`)
  await expect(page.getByText(/^The WH-347 goes to the contracting agency/)).toBeVisible()
  await page.getByRole('button', { name: 'Record WH-347 sent' }).click()
  await expect(page.getByText('Say who the WH-347 went to.')).toBeVisible()
  await page.getByLabel('Sent to').fill('Ulster County DPW')
  await page.getByRole('button', { name: 'Record WH-347 sent' }).click()
  await expect(page.getByTestId('wh347-sent')).toHaveText(
    'WH-347 sent to Ulster County DPW on Sep 15, 2026.',
  )

  await page.goto(DASHBOARD)
  await expect(page.getByTestId('federal-row')).toHaveText([/W\/E Sep 12/])
  const kingston = page.getByTestId('deadline-row').filter({ hasText: 'Kingston' })
  await expect(kingston).toContainText('Sep 5, Sep 12')
})
