// Session A acceptance (spec/19 §10): /app/hudson-electric/dashboard shows the
// empty frame with the right sidebar, company switcher and role switching,
// with no console errors.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const DASHBOARD = '/app/hudson-electric/dashboard'

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function switchRole(page: Page, role: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitemradio', { name: role }).click()
  await expect(page.getByRole('button', { name: `Viewing as ${role}` })).toBeVisible()
}

test('owner: title, sidebar, This week counter, no a11y or console errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto(DASHBOARD)

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toContainText('Tuesday, September 15')
  await expect(h1).toContainText('week ending Sat Sep 12')

  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link')).toHaveText([
    'Dashboard',
    /This week/,
    'Projects',
    'Workers',
    'Fringe plans',
    'Import',
    'Archive',
    'Setup',
    'Settings',
  ])
  await expect(nav.getByText('Company', { exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')

  // Three open weeks, two active projects: the filtered project list (spec/03 §3, 19 §4).
  const thisWeek = nav.getByRole('link', { name: /This week/ })
  await expect(thisWeek).toHaveText(/This week\s*3/)
  await expect(thisWeek).toHaveAttribute('href', '/app/hudson-electric/projects?open=1')

  await expect(page.getByRole('link', { name: 'Help and support' })).toBeVisible()
  await expect(page.getByText('Owner · 2 active projects')).toBeVisible()
  // One company: the name shows, but there is nothing to switch to.
  await expect(page.getByRole('button', { name: /Hudson Electric LLC/ })).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveCount(0)

  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  expect(errors).toEqual([])
})

test('viewer: no Import, Setup or Settings; This week stays (spec/02 §5)', async ({ page }) => {
  await page.goto(DASHBOARD)
  await switchRole(page, 'Viewer')
  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link', { name: 'Import' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Setup' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: /This week/ })).toBeVisible()
  await expect(page.getByText('Viewer · 2 active projects')).toBeVisible()
})

test('bookkeeper: switches to the second company and sees its trial', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto(DASHBOARD)
  await switchRole(page, 'Bookkeeper')

  const switcher = page.getByRole('button', { name: /Hudson Electric LLC/ })
  await expect(switcher).toBeVisible()
  await switcher.click()
  await expect(page.getByText('Your companies')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /See all companies/ })).toBeVisible()
  await page.getByRole('menuitem', { name: /Riverside Mechanical LLC/ }).click()

  await expect(page).toHaveURL(/\/app\/riverside-mechanical\/dashboard$/)
  await expect(page.getByText('Bookkeeper · 0 active projects')).toBeVisible()
  // Trial banner, without the billing button: only the owner may act on billing.
  await expect(page.getByRole('status')).toHaveText('Trial, 9 days left.')
  await expect(page.getByRole('button', { name: 'Add a payment method' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('narrower than 1024 px: the sidebar is a modal panel behind Menu (spec/14 §6)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto(DASHBOARD)
  await expect(page.getByRole('navigation')).toHaveCount(0)

  const menu = page.getByRole('button', { name: 'Menu' })
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(menu).toHaveAttribute('aria-controls', 'app-menu')
  await menu.click()

  const panel = page.getByRole('dialog', { name: 'Menu' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('navigation').getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(panel.getByRole('link', { name: 'Help and support' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(menu).toBeFocused()

  await menu.click()
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(menu).toBeFocused()
})

test('a company the user does not belong to is a 404 (spec/11 §6)', async ({ page }) => {
  const res = await page.goto('/app/riverside-mechanical/dashboard')
  expect(res?.status()).toBe(404)
  await expect(page.getByText(/That page does not exist/)).toBeVisible()
})

test('/api/health answers only {ok:true}', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})
