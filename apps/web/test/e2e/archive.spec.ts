// Session J acceptance (spec/20 J, spec/03 §4.8, spec/19 §10): the archive on
// the fixture data. "Everything for PRC 2010008390 in 2026" is one click.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const DUTCHESS_PRC = '2010008390'

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

const rows = (page: Page) => page.locator('tbody tr')

test('every filed version, newest first, with no console or a11y errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto(`${APP}/archive`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Archive\s*\d+ filed versions/)
  await expect(rows(page).first()).toContainText('Sep 5, 2026')
  // The whole table fits at 1280 px, the files column too (spec/19 §10: measured, not guessed).
  await page.setViewportSize({ width: 1280, height: 900 })
  const fits = await page.locator('table').evaluate((t) => {
    const box = t.parentElement?.getBoundingClientRect()
    return box ? t.getBoundingClientRect().right <= box.right + 1 : false
  })
  expect(fits).toBe(true)
  await page.screenshot({ path: '../../docs/screens/app-t-archive.png', fullPage: true })
  await expectNoSeriousA11y(page)
  expect(errors).toEqual([])
})

test('everything for one PRC in one click, then only 2026, then the export', async ({ page }) => {
  await page.goto(`${APP}/archive`)
  await page
    .getByRole('link', { name: `Everything for PRC ${DUTCHESS_PRC}` })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`query=${DUTCHESS_PRC}$`))
  const count = await rows(page).count()
  expect(count).toBeGreaterThan(10)
  for (const text of await rows(page).allTextContents()) expect(text).toContain(DUTCHESS_PRC)

  await page.getByLabel('Year').selectOption('2026')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page).toHaveURL(/year=2026/)
  await expect(rows(page)).toHaveCount(count)

  await expect(page.getByText(/^In this demo the export holds examples/)).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Export everything for this project' }).click(),
  ])
  expect(download.suggestedFilename()).toBe(`EXAMPLE_weeklycert-archive-${DUTCHESS_PRC}.zip`)
  const bytes = Buffer.concat(await (await download.createReadStream()).toArray())
  expect(bytes.subarray(0, 2).toString()).toBe('PK')
})

test('a corrected week shows both versions, and "Latest version only" keeps the newest', async ({
  page,
}) => {
  await page.goto(`${APP}/archive?query=${DUTCHESS_PRC}`)
  const aug8 = rows(page).filter({ hasText: 'Aug 8, 2026' })
  await expect(aug8).toHaveCount(2)
  await expect(aug8.nth(1)).toContainText('Corrected')
  await page.getByLabel('Versions').selectOption('latest')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(rows(page).filter({ hasText: 'Aug 8, 2026' })).toHaveCount(1)
})

test('a worker finds the weeks they appear in, and a status narrows it', async ({ page }) => {
  await page.goto(`${APP}/archive`)
  await page.getByLabel('Worker', { exact: true }).fill('Kowalski')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page).toHaveURL(/worker=Kowalski/)
  expect(await rows(page).count()).toBeGreaterThan(0)
  await page.getByLabel('Status').selectOption('rejected')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page)).toContainText('Rejected')
  await page.getByLabel('Worker', { exact: true }).fill('Nobody Atall')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page.getByText('No filed version matches these filters.')).toBeVisible()
})

test('the viewer reads the archive, without files or the export', async ({ page }) => {
  await page.goto(`${APP}/archive`)
  await switchRole(page, 'Viewer')
  await page.goto(`${APP}/archive?query=${DUTCHESS_PRC}`)
  await expect(rows(page).first()).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Files' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Export everything for this project' })).toHaveCount(
    0,
  )
  await switchRole(page, 'Owner')
})

test('loading, empty, error, forbidden and locked from ?state=', async ({ page }) => {
  const url = `${APP}/archive`
  await page.goto(`${url}?state=loading`)
  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
  await page.goto(`${url}?state=error`)
  await expect(page.getByText('This did not load.')).toBeVisible()
  await expect(page.getByText('Reference req_2f9a1c')).toBeVisible()
  await page.goto(`${url}?state=forbidden`)
  await expect(page.getByText('You do not have access to this page.')).toBeVisible()
  await page.goto(`${url}?state=locked`)
  await expect(page.getByText(/^Paused\. You can read and export everything\./)).toBeVisible()
  // Paused still reads and exports (08 §2.4).
  await expect(rows(page).first()).toBeVisible()
  await page.goto(`${url}?state=empty`)
  await expect(page.getByText(/^Nothing filed yet\./)).toBeVisible()
})
