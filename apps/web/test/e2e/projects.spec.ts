// Session F acceptance (spec/20 F, spec/03 §4.4, spec/19 §10): the project
// list, ?open=1, the new project form, the week timeline, the settings and the
// classification rates, on the fixture data.
//
// Tests that write create their own project first, so a second run against
// the same server finds the demo company exactly as the fixtures left it.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const KINGSTON = '01924000-0000-7000-8000-000000000002'
const BEACON = '01924000-0000-7000-8000-000000000003'

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

/** A PRC no earlier run has used: ten digits (spec/13 A6 is still open). */
const freshPrc = () => String(Date.now()).slice(-10)

/**
 * Creates a draft project starting 2026-08-31, so its timeline has two weeks
 * (Sep 5 and Sep 12). Draft keeps it out of "This week", which counts active
 * projects only, so the other tests still see the fixtures' three open weeks.
 */
async function createProject(page: Page, name: string): Promise<string> {
  await page.goto(`${APP}/projects/new`)
  await page.getByLabel('Project name').fill(name)
  await page.getByLabel('PRC number').fill(freshPrc())
  await page.getByLabel('Start date').fill('2026-08-31')
  await page.getByLabel('Status', { exact: true }).selectOption('draft')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
  return page.url().split('/').pop() ?? ''
}

test.describe('the list', () => {
  test('two active projects, their deadline and week, no console or a11y errors', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/projects`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Projects\s*2 active projects/)

    const rows = page.getByRole('row')
    await expect(rows.filter({ hasText: 'Dutchess County Courthouse Lighting' })).toContainText(
      'Sep 25, 2026',
    )
    // 30 days from the last accepted submission, Aug 26 (spec/05 §2), counted from MOCK_TODAY.
    await expect(rows.filter({ hasText: 'Dutchess County Courthouse Lighting' })).toContainText(
      '10 days left',
    )
    await expect(rows.filter({ hasText: 'Kingston WTP Electrical Upgrade' })).toContainText(
      '17 days left',
    )
    await expect(rows.filter({ hasText: 'Beacon HS' })).toHaveCount(0)

    await page.screenshot({ path: '../../docs/screens/app-t-projects.png', fullPage: true })
    await expectNoSeriousA11y(page)

    await page.getByRole('link', { name: 'Closed' }).click()
    await expect(page.getByRole('row').filter({ hasText: 'Beacon HS' })).toContainText(
      'No filing due',
    )
    expect(errors).toEqual([])
  })

  test('This week leads to ?open=1, oldest open week first, a click opens that week', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/dashboard`)
    await page
      .getByRole('navigation')
      .getByRole('link', { name: /This week/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects\?open=1$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weeks waiting for hours')
    await expect(page.getByRole('columnheader', { name: 'Oldest open week' })).toBeVisible()

    const body = page.locator('tbody tr')
    await expect(body).toHaveCount(2)
    await expect(body.nth(0)).toContainText('Dutchess County Courthouse Lighting')
    await expect(body.nth(0)).toContainText('Sep 5, 2026')
    await expect(body.nth(1)).toContainText('Kingston WTP Electrical Upgrade')
    await expect(body.nth(1)).toContainText('Sep 12, 2026')

    // spec/03 §4.4: the click opens the oldest open week, not the timeline.
    await body.nth(0).getByRole('link', { name: 'Dutchess County Courthouse Lighting' }).click()
    await expect(page).toHaveURL(`${APP}/projects/${DUTCHESS}/weeks/2026-09-05`)
    expect(errors).toEqual([])
  })

  test('the viewer reads the list and gets no Add a project', async ({ page }) => {
    await page.goto(`${APP}/projects`)
    await switchRole(page, 'Viewer')
    await expect(page.getByRole('link', { name: 'Add a project' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Enter hours' })).toHaveCount(0)
    await page.goto(`${APP}/projects/new`)
    await expect(page.getByText('You do not have access to this page.')).toBeVisible()
    await switchRole(page, 'Owner')
  })
})

test.describe('the timeline', () => {
  test('23 weeks without a gap, the numbers they will get, no console or a11y errors', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/projects/${DUTCHESS}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Dutchess County Courthouse Lighting\s*PRC 2010008390/,
    )

    // Every week from Apr 11 to Sep 12: 23 rows and 23 tiles (spec/19 §4).
    await expect(page.locator('tbody tr')).toHaveCount(23)
    const strip = page.getByRole('region', { name: 'Every week since the project started' })
    await expect(strip.getByRole('listitem')).toHaveCount(23)
    await expect(page.locator('tbody tr').last()).toContainText('Apr 11, 2026')

    const row = (date: string) => page.locator('tbody tr').filter({ hasText: date })
    await expect(row('Sep 12, 2026')).toContainText('will be #23')
    await expect(row('Sep 5, 2026')).toContainText('will be #22')
    await expect(row('Sep 5, 2026')).toContainText('3 errors, 3 warnings')
    await expect(row('Aug 29, 2026')).toContainText('Signed')
    await expect(row('Aug 8, 2026')).toContainText('v2')

    await expect(page.getByText('5 classifications')).toBeVisible()
    await page.screenshot({ path: '../../docs/screens/app-t-projects-id.png', fullPage: true })
    await expectNoSeriousA11y(page)

    await page.getByRole('link', { name: 'Open current week' }).click()
    await expect(page).toHaveURL(`${APP}/projects/${DUTCHESS}/weeks/2026-09-12`)
    expect(errors).toEqual([])
  })

  test('a week without entries and a no-work week look different', async ({ page }) => {
    await page.goto(`${APP}/projects/${KINGSTON}`)
    const row = (date: string) => page.locator('tbody tr').filter({ hasText: date })
    await expect(row('Sep 12, 2026')).toContainText('No entries')
    await expect(row('Aug 29, 2026')).toContainText('No work')
    await expect(page.getByText('NY20260014, modification 3')).toBeVisible()
  })

  test('a completed project reads as closed and offers to change its status', async ({ page }) => {
    await page.goto(`${APP}/projects/${BEACON}`)
    await expect(page.locator('tbody tr')).toHaveCount(24)
    await expect(
      page.getByText(
        'This project is closed. You can read everything, but nothing can be changed.',
      ),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Change the status' })).toBeVisible()
  })
})

test.describe('the form', () => {
  test('new project: unique PRC per contract, then its weeks, then a no-work week', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/projects/new`)
    await expect(page.getByLabel('Years to keep records')).toHaveValue('6')
    await page.screenshot({ path: '../../docs/screens/app-t-projects-new.png', fullPage: true })
    await expectNoSeriousA11y(page)

    // Nothing filled in: the errors are text, and focus goes to their count.
    await page.getByRole('button', { name: 'Create project' }).click()
    const summary = page.getByRole('alert').filter({ hasText: 'need attention' })
    await expect(summary).toHaveText('3 fields need attention.')
    await expect(summary).toBeFocused()
    await expect(page.getByText('Enter a name for the project.')).toBeVisible()

    // A PRC in another shape is only a warning: the format is unverified (13 A6).
    await page.getByLabel('Project name').fill('Poughkeepsie Station Lighting')
    await page.getByLabel('PRC number').fill('12345')
    await expect(
      page.getByText(
        'Every PRC number we have seen has ten digits. Check this one before you file.',
      ),
    ).toBeVisible()

    // The PRC Dutchess already uses, with the same (empty) contract number.
    await page.getByLabel('PRC number').fill('2010008390')
    await page.getByLabel('Start date').fill('2026-08-31')
    await page.getByLabel('Status', { exact: true }).selectOption('draft')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(
      page.getByText(
        'Another project already uses this PRC number with the same contract number: Dutchess County Courthouse Lighting.',
      ),
    ).toBeVisible()

    await page.getByLabel('PRC number').fill(freshPrc())
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Poughkeepsie Station Lighting',
    )
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(1)).toContainText('will be #1')
    await expect(rows.nth(1)).toContainText('No entries')

    await rows.nth(1).getByRole('button', { name: 'Mark no-work week' }).click()
    await expect(rows.nth(1)).toContainText('No work')
    await expect(rows.nth(1).getByRole('button', { name: 'Mark no-work week' })).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('settings: the week end is the company’s and cannot change', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/projects/${KINGSTON}/settings`)
    const weekEnd = page.getByLabel('Weeks end on')
    await expect(weekEnd).toHaveValue('Saturday')
    await expect(weekEnd).toHaveAttribute('readonly', '')
    await expect(page.getByText(/cannot change once a project has its first week/)).toBeVisible()
    await expect(page.getByLabel('Wage determination number')).toHaveValue('NY20260014')
    await page.screenshot({
      path: '../../docs/screens/app-t-projects-id-settings.png',
      fullPage: true,
    })
    await expectNoSeriousA11y(page)

    await page.getByLabel('Site address').fill('1 Tietjen Ave, Kingston NY')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('classifications and rates', () => {
  test('Ironworker has no rate for the current week, no console or a11y errors', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/projects/${DUTCHESS}/classifications`)
    await expect(page.getByText('A rate is missing for the current week')).toBeVisible()
    await expect(
      page.getByText('Ironworker – Structural has no rate for the week ending Sep 12, 2026.', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(5)
    await page.screenshot({
      path: '../../docs/screens/app-t-projects-id-classifications.png',
      fullPage: true,
    })
    await expectNoSeriousA11y(page)
    expect(errors).toEqual([])
  })

  test('a new rate version from a date keeps the old rate on the weeks before it', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    const id = await createProject(page, 'Rhinebeck Fairgrounds Lighting')
    await page.goto(`${APP}/projects/${id}/classifications`)

    await page.getByRole('button', { name: 'Add a classification' }).click()
    await page
      .getByLabel('Classification', { exact: true })
      .selectOption({ label: 'Electrician – Inside Wireman' })
    await page.getByLabel('Base rate').fill('63.20')
    await page.getByLabel('Supplement').fill('52.40')
    await page.getByLabel('OT codes').fill('A, W, Q9')
    await page.getByLabel('Effective from').fill('2026-07-01')
    await page.getByRole('button', { name: 'Add classification' }).click()
    await expect(page.getByText('Q9 is not an NY overtime code.')).toBeVisible()
    await page.getByLabel('OT codes').fill('A, W, R')
    await page.getByRole('button', { name: 'Add classification' }).click()
    await expect(page.locator('tbody tr')).toHaveCount(1)

    await page.getByRole('button', { name: 'Add a new rate version' }).click()
    await page.getByLabel('Effective from').fill('2026-09-13')
    await page.getByLabel('Base rate').fill('64.50')
    await page.getByRole('button', { name: 'Add rate version' }).click()

    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toContainText('$64.50')
    await expect(rows.nth(0)).toContainText('Sep 13, 2026')
    await expect(rows.nth(0)).toContainText('No end date')
    // The old row keeps its rate and ends the day before.
    await expect(rows.nth(1)).toContainText('$63.20')
    await expect(rows.nth(1)).toContainText('Jul 1, 2026')
    await expect(rows.nth(1)).toContainText('Sep 12, 2026')
    expect(errors).toEqual([])
  })
})

// spec/19 §7: every state from the URL, on every screen of the session.
const SCREENS = [
  ['list', `${APP}/projects`],
  ['new', `${APP}/projects/new`],
  ['timeline', `${APP}/projects/${DUTCHESS}`],
  ['settings', `${APP}/projects/${DUTCHESS}/settings`],
  ['classifications', `${APP}/projects/${DUTCHESS}/classifications`],
] as const

for (const [name, url] of SCREENS) {
  test(`${name}: loading, empty, error, forbidden and locked from ?state=`, async ({ page }) => {
    await page.goto(`${url}?state=loading`)
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()

    await page.goto(`${url}?state=error`)
    await expect(page.getByText('This did not load.')).toBeVisible()
    await expect(page.getByText('Reference req_2f9a1c')).toBeVisible()

    await page.goto(`${url}?state=forbidden`)
    await expect(page.getByText('You do not have access to this page.')).toBeVisible()

    await page.goto(`${url}?state=locked`)
    const locked =
      name === 'list' || name === 'new'
        ? page.getByText(/^Paused\. You can read and export everything\./)
        : page.getByText(
            'This project is closed. You can read everything, but nothing can be changed.',
          )
    await expect(locked).toBeVisible()

    await page.goto(`${url}?state=empty`)
    const empty = {
      list: page.getByText('No projects yet'),
      new: page.getByLabel('Project name'),
      timeline: page.getByText('No weeks yet'),
      settings: page.getByLabel('Project name'),
      classifications: page.getByText('No classifications yet'),
    }[name]
    await expect(empty).toBeVisible()
  })
}
