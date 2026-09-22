// Session E acceptance (spec/03 §4.5, spec/19 §10): review, signature and
// filing on the fixture data.
//
// The flow that writes runs on its own project week: it creates a project,
// types one day of hours into it, and takes that week all the way from review
// to a filed report, so a second run finds the demo company untouched.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const IN_REVIEW = '2026-09-05'
const SIGNED = '2026-08-29'
const REJECTED = '2026-08-15'

const week = (projectId: string, weekEnding: string) =>
  `${APP}/projects/${projectId}/weeks/${weekEnding}`

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

test.describe('the review screen', () => {
  test('the week per worker, the findings and the two examples, with no console or a11y errors', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.setViewportSize({ width: 1600, height: 1100 })
    await page.goto(`${week(DUTCHESS, IN_REVIEW)}/review`)

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Review and certify')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'payroll no. will be #22 on signature',
    )

    // Kowalski works two classifications, so he has two lines (spec/05 §4.3).
    const kowalski = page.getByRole('row').filter({ hasText: 'Kowalski, Pete' })
    await expect(kowalski.first()).toContainText('Laborer – Group 1')

    // The same findings as the grid, in the same panel (spec/03 §4.5).
    const panel = page.getByRole('complementary')
    await expect(panel).toContainText('3 errors, 3 warnings')

    // Neither output is generated in this phase, and both say so (spec/19 §11).
    await expect(
      page
        .getByText('An example of what the file will hold. Real files come with the generator.')
        .first(),
    ).toBeVisible()
    await expect(page.getByText('<ProjectRollup>')).toBeVisible()

    await page.screenshot({
      path: '../../docs/screens/app-t-projects-id-weeks-we-review.png',
      fullPage: true,
    })
    await expectNoSeriousA11y(page)
    expect(errors).toEqual([])
  })

  test('a blocking finding refuses the draft, and says how many (spec/07 §1)', async ({ page }) => {
    await page.goto(`${week(DUTCHESS, IN_REVIEW)}/review`)
    const generate = page.getByRole('button', { name: 'Generate the draft' })
    await expect(generate).toBeDisabled()
  })

  test('the viewer reads the summary without deductions or net pay (spec/02 §3)', async ({
    page,
  }) => {
    await page.goto(`${week(DUTCHESS, IN_REVIEW)}/review`)
    await page.getByRole('button', { name: /^Viewing as/ }).click()
    await page.getByRole('menuitemradio', { name: 'Viewer' }).click()
    await expect(page.getByRole('button', { name: 'Viewing as Viewer' })).toBeVisible()

    await expect(page.getByRole('columnheader', { name: 'Net pay' })).toHaveCount(0)
    await expect(page.getByText('Deductions and all work')).toHaveCount(0)

    await page.getByRole('button', { name: /^Viewing as/ }).click()
    await page.getByRole('menuitemradio', { name: 'Owner' }).click()
  })
})

test.describe('the certification', () => {
  test('a signed week is locked and points at its reports', async ({ page }) => {
    await page.goto(`${week(DUTCHESS, SIGNED)}/sign`)
    await expect(page.getByText(/This week was signed on .* and cannot be changed/)).toBeVisible()
    await page.getByRole('link', { name: 'Reports and filing' }).click()
    await expect(page).toHaveURL(`${week(DUTCHESS, SIGNED)}/reports`)
  })

  test('payroll prepares the week but never signs it (spec/02 §2)', async ({ page }) => {
    await page.goto(`${week(DUTCHESS, SIGNED)}/sign`)
    await page.getByRole('button', { name: /^Viewing as/ }).click()
    await page.getByRole('menuitemradio', { name: 'Payroll' }).click()
    await expect(page.getByText('You do not have access to this page.')).toBeVisible()
    await expect(page.getByText('This page needs the Signer role.')).toBeVisible()

    await page.getByRole('button', { name: /^Viewing as/ }).click()
    await page.getByRole('menuitemradio', { name: 'Owner' }).click()
  })
})

test.describe('reports and filing', () => {
  test('the versions of a signed week, its example file, and what the portal said', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(`${week(DUTCHESS, SIGNED)}/reports`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Reports and filing')

    const row = page.locator('tbody tr').first()
    await expect(row).toContainText('v1')
    await expect(row).toContainText('Hodzic')

    // The steps name this project and this week, never a placeholder.
    await expect(
      page.getByText(/Pick project PRC 2010008390, then week ending Aug 29, 2026/),
    ).toBeVisible()

    // The download serves the example, and says in its name that it is one.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row.getByRole('link', { name: 'Download' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^EXAMPLE_2010008390_2026-08-29_v1\.xml$/)

    await page.screenshot({
      path: '../../docs/screens/app-t-projects-id-weeks-we-reports.png',
      fullPage: true,
    })
    await expectNoSeriousA11y(page)
    expect(errors).toEqual([])
  })

  test('a rejection keeps the words the portal used', async ({ page }) => {
    await page.goto(`${week(DUTCHESS, REJECTED)}/reports`)
    await expect(page.getByText(/element address1 is longer than 42 characters/)).toBeVisible()
    await expect(page.getByText('Rejected')).toBeVisible()
  })
})

test.describe('the whole way, on a week of its own', () => {
  /**
   * A correction of an already filed week (spec/04 §7): it carries the hours
   * over, so the review has something to show, and signing it closes the week
   * again, which leaves the demo company as the fixtures had it.
   */
  test('correction, payroll figures, draft, signature and the filing', async ({ page }) => {
    // Six screens and four writes, each with the mock's own 120 to 250 ms.
    test.setTimeout(120_000)
    const errors = collectErrors(page)
    const CORRECTED = '2026-08-22'
    await page.goto(`${week(DUTCHESS, CORRECTED)}/reports`)

    await page.getByLabel('What is being corrected').fill('Chen worked Saturday, not Friday.')
    await page.getByRole('button', { name: 'Create a correction' }).click()
    await expect(page).toHaveURL(week(DUTCHESS, CORRECTED))

    await page.goto(`${week(DUTCHESS, CORRECTED)}/review`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Review and certify')

    // The payroll side the hours cannot know (spec/03 §4.5).
    // Gross for all work covers this project and one other, so it is above the
    // gross on this project, and gross minus the deductions is the net pay.
    // Either of those wrong is a blocking finding (spec/07 §3).
    await page.getByLabel('Gross for all work').first().fill('3000')
    await page.getByLabel('Net pay').first().fill('2100.25')
    await page.getByRole('button', { name: 'Add a deduction' }).first().click()
    await page.getByLabel('Amount').first().fill('899.75')
    await page.getByRole('button', { name: 'Save payroll figures' }).click()
    await expect(page.getByRole('cell', { name: '$3,000.00' }).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('cell', { name: '$899.75' }).first()).toBeVisible()

    // The draft runs as a job and the screen waits for it (spec/19 §2).
    const generate = page.getByRole('button', { name: 'Generate the draft' })
    await expect(generate).toBeEnabled()
    await generate.click()
    await expect(page.getByText(/Draft v1 is ready\./)).toBeVisible({ timeout: 20000 })

    await page.getByRole('link', { name: 'Sign and lock this week' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Certify this week')
    await expect(
      page.getByText(/The payroll information submitted with this statement/),
    ).toBeVisible()
    await expect(page.getByText('Always required.').first()).toBeVisible()
    await page.screenshot({
      path: '../../docs/screens/app-t-projects-id-weeks-we-sign.png',
      fullPage: true,
    })
    await expectNoSeriousA11y(page)

    // The session is not enough: the signer re-authenticates (spec/02 §4).
    await page.getByRole('button', { name: 'Sign and lock this week' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Enter your' })).toContainText(
      'Enter your password or your two-factor code.',
    )

    await page.getByLabel('I understand what I am signing.').check()
    await page.getByLabel('Re-enter your password or two-factor code').fill('demo')
    await page.getByRole('button', { name: 'Sign and lock this week' }).click()

    await expect(page).toHaveURL(`${week(DUTCHESS, CORRECTED)}/reports`)
    // A correction inherits the number of the week it corrects (spec/04).
    await expect(page.getByRole('heading', { level: 1 })).toContainText('payroll no. #20')
    // Signed as the owner, who is who this demo is signed in as (spec/19 §4).
    await expect(page.locator('tbody tr').first()).toContainText('Mirza Hodzic')

    // The portal has no API, so the filing and its answer are recorded by hand.
    await page.getByLabel('Confirmation number').fill('A870999')
    await page.getByRole('button', { name: 'Record submission' }).click()
    await expect(page.getByText('A870999')).toBeVisible()

    await page.getByLabel('What the portal said').fill('Line 51: address1 is too long.')
    await page.getByRole('button', { name: 'Rejected' }).click()
    await expect(page.getByText('Line 51: address1 is too long.')).toBeVisible()
    expect(errors).toEqual([])
  })
})

// spec/19 §7: every state from the URL, on all three screens.
const SCREENS = [
  ['review', `${week(DUTCHESS, IN_REVIEW)}/review`],
  ['sign', `${week(DUTCHESS, IN_REVIEW)}/sign`],
  ['reports', `${week(DUTCHESS, IN_REVIEW)}/reports`],
] as const

for (const [name, url] of SCREENS) {
  test(`${name}: loading, empty, error, forbidden and locked from ?state=`, async ({ page }) => {
    await page.goto(`${url}?state=loading`)
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()

    await page.goto(`${url}?state=error`)
    await expect(page.getByText('This did not load.')).toBeVisible()

    await page.goto(`${url}?state=forbidden`)
    await expect(page.getByText('You do not have access to this page.')).toBeVisible()

    await page.goto(`${url}?state=locked`)
    const locked =
      name === 'reports'
        ? page.getByRole('heading', { name: 'Reports and filing' })
        : page.getByText(/cannot be changed|No report yet/)
    await expect(locked.first()).toBeVisible()

    await page.goto(`${url}?state=empty`)
    const empty = {
      review: page.getByText('No hours yet for this week'),
      sign: page.getByText('No report yet'),
      reports: page.getByText('No report yet'),
    }[name]
    await expect(empty).toBeVisible()
  })
}
