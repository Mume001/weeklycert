// Session I acceptance (spec/20 I, spec/03 §4.7, spec/06): a file through the
// four steps into the grid and back out with undo, on the fixture data.
//
// The flow imports into Dutchess's open week and undoes it at the end, so the
// tests after it find the week as the fixtures left it.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const DUTCHESS = '01924000-0000-7000-8000-000000000001'
const OPEN_WEEK = '2026-09-12'
const WIREMAN = 'Electrician – Inside Wireman'
/** A value in the shape of a full SSN, assembled at run time (the ssn gate); area 000 is never issued. */
const FULL_SSN_SHAPE = ['000', '12', '3456'].join('-')

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

const csv = (lines: string[]) => Buffer.from(`${lines.join('\r\n')}\r\n`, 'utf8')

async function upload(page: Page, name: string, buffer: Buffer, mimeType = 'text/csv') {
  await page.getByLabel('File', { exact: true }).setInputFiles({ name, mimeType, buffer })
  await page.getByRole('button', { name: 'Upload and continue' }).click()
}

test("the grid's Import CSV opens step 1 on that project and week", async ({ page }) => {
  await page.goto(`${APP}/projects/${DUTCHESS}/weeks/${OPEN_WEEK}`)
  await page.getByRole('link', { name: 'Import CSV' }).click()
  await expect(page).toHaveURL(/\/imports\/new\?kind=hours&project=.+&week=2026-09-12$/)
  await expect(page.getByLabel('Week ending')).toHaveValue(OPEN_WEEK)
  await expect(page.getByLabel('Hours by day')).toBeChecked()
})

test('hours: upload, mapping, check with a pick, reconcile, apply into the grid, undo', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto(`${APP}/imports/new?kind=hours&project=${DUTCHESS}&week=${OPEN_WEEK}`)
  await page.screenshot({ path: '../../docs/screens/app-t-imports-new.png', fullPage: true })
  await expectNoSeriousA11y(page)
  await upload(
    page,
    'tsheets-week.csv',
    csv([
      'Employee,Date,Service item,Hours',
      `1021,09/06/2026,${WIREMAN},8`,
      `J. Smith,09/06/2026,${WIREMAN},6:00`,
      `"=HYPERLINK(""http://example.test"")",09/06/2026,${WIREMAN},4`,
    ]),
  )

  // Step 2: suggested from the column names.
  await expect(page.locator('[aria-current="step"]')).toContainText('Mapping')
  await expect(page.getByLabel('Worker', { exact: true })).toHaveValue('0')
  await expect(page.getByLabel('Hours', { exact: true })).toHaveValue('3')
  await expectNoSeriousA11y(page)
  await page.getByRole('button', { name: 'Check the rows' }).click()

  // Step 3: the formula-looking name is only text, and matches nobody.
  await expect(page.locator('[aria-current="step"]')).toContainText('Check')
  await expect(page.getByText('3 rows in the file')).toBeVisible()
  await expect(page.getByText('2 errors, these block')).toBeVisible()
  await expect(page.getByRole('cell', { name: '=HYPERLINK("http://example.test")' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to reconcile' })).toBeDisabled()
  await page.getByLabel('Match J. Smith to').selectOption({ label: 'Chen, David' })
  await page.getByRole('button', { name: 'Save these matches' }).click()
  await expect(page.getByText('1 error, this blocks')).toBeVisible()
  await expectNoSeriousA11y(page)
  await page.getByLabel('Skip the rows with errors').check()
  await page.getByRole('button', { name: 'Continue to reconcile' }).click()

  // Step 4: the file against the week before, then the import.
  await expect(page.getByRole('heading', { name: 'Hours in the file, by worker' })).toBeVisible()
  const rows = page.locator('tbody tr')
  await expect(rows.filter({ hasText: 'Alvarez, Miguel' })).toContainText('8.0')
  await expect(rows.filter({ hasText: 'Chen, David' })).toContainText('6.0')
  await expectNoSeriousA11y(page)
  await page.getByRole('button', { name: 'Confirm the import' }).click()
  await expect(page.getByRole('heading', { name: 'Import finished' })).toBeVisible()
  await expect(page.getByText('2 rows imported')).toBeVisible()
  await expect(page.getByText('1 row skipped')).toBeVisible()

  // The history, and undo.
  await page.goto(`${APP}/imports`)
  await expect(page.locator('tbody tr').first()).toContainText('tsheets-week.csv')
  await expect(page.locator('tbody tr').first()).toContainText('Applied')
  await page.screenshot({ path: '../../docs/screens/app-t-imports.png', fullPage: true })
  await expectNoSeriousA11y(page)
  await page.getByRole('link', { name: 'tsheets-week.csv' }).first().click()
  await page.screenshot({ path: '../../docs/screens/app-t-imports-id.png', fullPage: true })
  await page.getByRole('button', { name: 'Undo this import' }).click()
  await page.getByRole('button', { name: 'Undo import' }).click()
  await expect(page.getByText('Import undone.')).toBeVisible()
  expect(errors).toEqual([])
})

test('refused before reading: an old .xls file', async ({ page }) => {
  await page.goto(`${APP}/imports/new`)
  const xls = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0])
  await upload(page, 'old.xls', xls, 'application/vnd.ms-excel')
  await expect(
    page.getByText('This is an old Excel file (.xls). Save it as .xlsx or .csv and upload again.'),
  ).toBeVisible()
})

test('a column of full SSNs is cut to four digits and never reaches the page', async ({ page }) => {
  await page.goto(`${APP}/imports/new?kind=workers`)
  await upload(
    page,
    'crew.csv',
    csv(['First name,Last name,SSN,City,ZIP', `Ana,Lee,${FULL_SSN_SHAPE},Beacon,12508`]),
  )
  await expect(page.getByText(/looks like full Social Security numbers/)).toBeVisible()
  expect(await page.content()).not.toContain(FULL_SSN_SHAPE)
  await page.getByRole('button', { name: 'Check the rows' }).click()
  await expect(page.getByRole('cell', { name: 'Lee, Ana' })).toBeVisible()
  expect(await page.content()).not.toContain(FULL_SSN_SHAPE)
})

test('the viewer has no import', async ({ page }) => {
  await page.goto(`${APP}/imports`)
  await switchRole(page, 'Viewer')
  await page.goto(`${APP}/imports`)
  await expect(page.getByText('You do not have access to this page.')).toBeVisible()
  await switchRole(page, 'Owner')
})

test('the five states of every import screen, from ?state=', async ({ page }) => {
  await page.goto(`${APP}/imports/new?kind=hours&project=${DUTCHESS}&week=${OPEN_WEEK}`)
  await upload(page, 'states.csv', csv(['Employee,Date,Hours', '1021,09/06/2026,8']))
  await expect(page).toHaveURL(/batch=/)
  const batch = new URL(page.url()).searchParams.get('batch')
  for (const url of [`${APP}/imports`, `${APP}/imports/new`, `${APP}/imports/${batch}`]) {
    await page.goto(`${url}?state=loading`)
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
    await page.goto(`${url}?state=error`)
    await expect(page.getByText('This did not load.')).toBeVisible()
    await page.goto(`${url}?state=forbidden`)
    await expect(page.getByText('You do not have access to this page.')).toBeVisible()
    await page.goto(`${url}?state=locked`)
    await expect(page.getByText(/^Paused\. You can read and export everything\./)).toBeVisible()
    await page.goto(`${url}?state=empty`)
    await expect(page.locator('main, body').first()).toBeVisible()
  }
  await page.goto(`${APP}/imports?state=empty`)
  await expect(page.getByText(/^No imports yet\./)).toBeVisible()
})
