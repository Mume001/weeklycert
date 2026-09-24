// Session G acceptance (spec/20 G, spec/03 §4.6, spec/19 §10): the workers,
// one worker, and the fringe plans with the premium converter, on the fixtures.
//
// The rules this file exists for: no address and no SSN in the list; the
// viewer gets the name and the classification and nothing else reaches their
// browser; the SSN field takes four digits; SSN4 or DOB, one of the two; a
// hidden value reads as dots until Show; the converter shows its divisor.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const ALVAREZ = '01927000-0000-7000-8000-000000000001'
const ANNUITY = '01929000-0000-7000-8000-000000000005'
/** Values the fixtures hold as PII for Alvarez (spec/19 §4); none may reach the list or a viewer. */
const ALVAREZ_PII = ['4417', 'Poughkeepsie']

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

test.describe('the list', () => {
  test('twelve workers, no address or SSN on the page, no console or a11y errors', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/workers`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Workers\s*1[2-9] active workers/,
    )
    await expect(page.locator('tbody tr').filter({ hasText: 'Alvarez, Miguel' })).toContainText(
      'Dutchess County Courthouse Lighting',
    )
    const html = await page.content()
    for (const value of ALVAREZ_PII) expect(html).not.toContain(value)
    await page.screenshot({ path: '../../docs/screens/app-t-workers.png', fullPage: true })
    await expectNoSeriousA11y(page)
    expect(errors).toEqual([])
  })

  test('searches by name and by worker number', async ({ page }) => {
    await page.goto(`${APP}/workers`)
    await page.getByLabel('Search by name or worker number').fill('1050')
    await page.getByLabel('Search by name or worker number').press('Enter')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('tbody tr')).toContainText('Ortega, Luis')
  })

  test('the viewer sees the name and the classification, and nothing else reaches the browser', async ({
    page,
  }) => {
    await page.goto(`${APP}/workers`)
    await switchRole(page, 'Viewer')
    await page.goto(`${APP}/workers`)
    await expect(page.getByRole('columnheader')).toHaveText(['Worker', 'Default classification'])
    await expect(page.getByRole('link', { name: 'Add a worker' })).toHaveCount(0)
    let html = await page.content()
    // Not the worker number either: 02 §3 gives the viewer the name and the classification.
    for (const value of [...ALVAREZ_PII, '1021']) expect(html).not.toContain(value)

    await page.goto(`${APP}/workers/${ALVAREZ}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alvarez, Miguel')
    await expect(page.getByRole('button', { name: /^Show/ })).toHaveCount(0)
    html = await page.content()
    for (const value of [...ALVAREZ_PII, '1021']) expect(html).not.toContain(value)
    await switchRole(page, 'Owner')
  })
})

test.describe('one worker', () => {
  test('the SSN reads as dots until Show, and Show says it was logged', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/workers/${ALVAREZ}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alvarez, Miguel')
    expect(await page.content()).not.toContain('4417')
    await expect(page.getByText('Hidden. Every view is logged.').first()).toBeAttached()
    await page.screenshot({ path: '../../docs/screens/app-t-workers-id.png', fullPage: true })
    await expectNoSeriousA11y(page)

    await page.getByRole('button', { name: 'Show the last 4 of the SSN' }).click()
    const ssn = page.getByLabel('Last 4 of SSN')
    await expect(ssn).toHaveValue('4417')
    await expect(page.getByText('Shown. This view was logged.').first()).toBeVisible()
    // The field shows "••••4417": the dots stay in front of the four digits.
    await expect(ssn.locator('xpath=preceding-sibling::span')).toHaveText('••••')

    await page.getByRole('button', { name: 'Show the full address and phone' }).click()
    await expect(page.getByLabel('City')).toHaveValue('Poughkeepsie')
    expect(errors).toEqual([])
  })

  test('Show is reached and pressed with the keyboard only', async ({ page }) => {
    await page.goto(`${APP}/workers/${ALVAREZ}`)
    await page.getByLabel('First name').focus()
    const target = 'Show the last 4 of the SSN'
    for (let i = 0; i < 20; i++) {
      const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
      if (label === target) break
      await page.keyboard.press('Tab')
    }
    await expect(page.getByRole('button', { name: target })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Last 4 of SSN')).toHaveValue('4417')
  })

  test('the SSN field takes four digits and no more', async ({ page }) => {
    await page.goto(`${APP}/workers/new`)
    const ssn = page.getByLabel('Last 4 of SSN')
    await ssn.pressSequentially('12345')
    await expect(ssn).toHaveValue('1234')
  })

  test('new worker: SSN4 or a date of birth, one of the two, then the worker opens', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    const last = `Test${Date.now()}`
    await page.goto(`${APP}/workers/new`)
    await page.getByLabel('First name').fill('Ana')
    await page.getByLabel('Last name').fill(last)
    await page.screenshot({ path: '../../docs/screens/app-t-workers-new.png', fullPage: true })
    await expectNoSeriousA11y(page)

    await page.getByRole('button', { name: 'Create worker' }).click()
    await expect(page.getByText('Enter the last 4 of the SSN or a date of birth.')).toBeVisible()

    await page.getByLabel('Last 4 of SSN').fill('0042')
    await page.getByLabel('Date of birth').fill('1990-01-01')
    await page.getByRole('button', { name: 'Create worker' }).click()
    await expect(
      page.getByText(
        'Enter the last 4 of the SSN or a date of birth, not both. The portal takes one.',
      ),
    ).toBeVisible()

    await page.getByLabel('Date of birth').fill('')
    await page.getByRole('button', { name: 'Create worker' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${last}, Ana`)
    // Saved and hidden again: the page carries the dots, not the digits.
    await expect(page.getByRole('button', { name: 'Show the last 4 of the SSN' })).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('fringe plans', () => {
  test('five plans, and the converter shows the divisor and the 2,080-hour rule', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${APP}/fringe-plans`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Fringe plans\s*\d+ plans/)
    await expect(
      page.locator('tbody tr').filter({ hasText: 'Ironworkers Annuity Fund' }),
    ).toBeVisible()

    await page.goto(`${APP}/fringe-plans?plan=${ANNUITY}`)
    await expect(page.getByRole('heading', { name: 'Edit Ironworkers Annuity Fund' })).toBeVisible()
    await page.getByLabel('Monthly premium').fill('600')
    // Golden 6 of spec/01 §5: 600 a month over 2,080 hours is 3.46 an hour.
    await expect(page.getByText('$600.00 a month is $7,200.00 a year.')).toBeVisible()
    await expect(
      page.getByText('$7,200.00 divided by 2,080 hours is $3.46 per hour.'),
    ).toBeVisible()
    await expect(page.getByText(/New York counts 2,080 hours a year/)).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: '../../docs/screens/app-t-fringe-plans.png', fullPage: true })
    await expectNoSeriousA11y(page)

    await page.getByRole('button', { name: 'Use this credit' }).click()
    await expect(page.getByLabel('Credit per hour')).toHaveValue('3.4615')
    expect(errors).toEqual([])
  })

  test('the viewer reads the plans and changes nothing', async ({ page }) => {
    await page.goto(`${APP}/fringe-plans`)
    await switchRole(page, 'Viewer')
    await page.goto(`${APP}/fringe-plans`)
    await expect(page.getByRole('link', { name: 'Add a fringe plan' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)
    await switchRole(page, 'Owner')
  })
})

// spec/19 §7: every state from the URL, on every screen of the session.
const SCREENS = [
  ['list', `${APP}/workers`],
  ['new', `${APP}/workers/new`],
  ['worker', `${APP}/workers/${ALVAREZ}`],
  ['fringe', `${APP}/fringe-plans`],
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
    await expect(page.getByText(/^Paused\. You can read and export everything\./)).toBeVisible()

    await page.goto(`${url}?state=empty`)
    const empty = {
      list: page.getByText('No workers yet', { exact: true }),
      new: page.getByRole('heading', { level: 1, name: 'New worker' }),
      worker: page.getByText('No weeks with hours yet.'),
      fringe: page.getByText('No fringe plans yet'),
    }[name]
    await expect(empty).toBeVisible()
  })
}
