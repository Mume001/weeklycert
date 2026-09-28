// Session N acceptance (spec/20 N, spec/03 §4.10, spec/02 §1, spec/11 §2 and
// §4): the platform admin, for the super-admin alone, and support access that
// the company's owner sees in the audit log.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const PAGES = [
  ['/admin', 'Overview'],
  ['/admin/tenants', 'Companies'],
  ['/admin/jobs', 'Jobs'],
  ['/admin/wage-schedules', 'Wage schedules'],
  ['/admin/classifications', 'Classifications'],
] as const
const FORBIDDEN = 'This page is for the platform administrator, with two-factor authentication on.'

async function expectNoSeriousA11y(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

async function signInAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('super@weeklycert.test')
  await page.getByLabel('Password').fill('demo')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Code').fill('123456')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).toHaveURL('/admin')
}

test('every other role gets the forbidden state, on every admin page', async ({ page }) => {
  for (const [url] of PAGES) {
    await page.goto(url)
    await expect(page.getByText(FORBIDDEN)).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'WeeklyCert admin' })).toHaveCount(0)
  }
  // The owner of a company is still no platform admin; the bookkeeper neither.
  await page.goto('/app/hudson-electric/dashboard')
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitemradio', { name: 'Bookkeeper' }).click()
  await expect(page.getByRole('button', { name: 'Viewing as Bookkeeper' })).toBeVisible()
  await page.goto('/admin/tenants')
  await expect(page.getByText(FORBIDDEN)).toBeVisible()
})

test('the admin pages for the platform admin, with no a11y errors', async ({ page }) => {
  await signInAsAdmin(page)
  await expect(page.getByTestId('admin-stats')).toContainText('$79.00')
  for (const [url, title] of PAGES) {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    const name = url === '/admin' ? 'admin' : `admin-${url.split('/')[2]}`
    await page.screenshot({ path: `../../docs/screens/${name}.png`, fullPage: true })
    await expectNoSeriousA11y(page)
  }
  await page.goto('/admin/classifications')
  await expect(page.getByTestId('catalog-diff')).toContainText('Electrician – Teledata Technician')
})

test('the main action: support access with a reason, read only, in the owner audit log', async ({
  page,
  browser,
}) => {
  await signInAsAdmin(page)
  await page.goto('/admin/tenants')
  await page.getByLabel('Search by name or slug').fill('hudson')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByTestId('admin-tenant-row')).toHaveCount(1)
  await page.getByRole('link', { name: 'Open' }).click()
  await page.screenshot({ path: '../../docs/screens/admin-tenants-id.png', fullPage: true })
  await page.getByRole('button', { name: 'Open with support access' }).click()
  await expect(page.getByText('Give the reason for the access.')).toBeVisible()
  await page.getByLabel('Reason').fill('Ticket 41: totals on the Sep 12 week')
  await page.getByRole('button', { name: 'Open with support access' }).click()

  await expect(page).toHaveURL('/app/hudson-electric/dashboard')
  const banner = page
    .getByRole('status')
    .filter({ hasText: /^Support access to Hudson Electric LLC, read only, until/ })
  await expect(banner).toBeVisible()
  // Read only: the week's grid takes no hours, the settings refuse a change.
  await page.goto('/app/hudson-electric/settings/team')
  await expect(page.getByRole('button', { name: 'Send invitation' })).toHaveCount(0)

  await page.getByRole('button', { name: 'End support access' }).first().click()
  await expect(page).toHaveURL(/\/admin\/tenants\/.+/)
  const after = await page.goto('/app/hudson-electric/dashboard')
  expect(after?.status()).toBe(404)

  // The owner sees it, with the reason, in the company's own audit log.
  const owner = await browser.newPage()
  await owner.goto('/app/hudson-electric/settings/audit?kind=support')
  await expect(owner.getByTestId('audit-row').first()).toBeVisible()
  await expect(owner.getByText('Ticket 41: totals on the Sep 12 week')).toBeVisible()
  await owner.close()
})

test('a failed job is retried, a schedule is approved', async ({ page }) => {
  await signInAsAdmin(page)
  await page.goto('/admin/jobs')
  const failed = page.getByTestId('job-row').filter({ hasText: 'wage_schedule.fetch' })
  await expect(failed).toContainText('Failed')
  await failed.getByRole('button', { name: 'Retry' }).click()
  await expect(failed).toContainText('Waiting')

  await page.goto('/admin/wage-schedules')
  const waiting = page.getByTestId('schedule-row').filter({ hasText: 'NY20260012 mod 3' })
  await expect(waiting).toContainText('Parsed, waiting for approval')
  await waiting.getByRole('button', { name: 'Approve rates' }).click()
  await expect(waiting).toContainText('Approved')
})

test('loading, empty, error and forbidden from ?state=', async ({ page }) => {
  await signInAsAdmin(page)
  for (const [url] of PAGES) {
    await page.goto(`${url}?state=loading`)
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
    await page.goto(`${url}?state=error`)
    await expect(page.getByText('This did not load.')).toBeVisible()
    await page.goto(`${url}?state=forbidden`)
    await expect(page.getByText(FORBIDDEN)).toBeVisible()
  }
  await page.goto('/admin/tenants?state=empty')
  await expect(page.getByText('No company matches that.')).toBeVisible()
  await page.goto('/admin/classifications?state=empty')
  await expect(page.getByText('The list matches the official page.')).toBeVisible()
})
