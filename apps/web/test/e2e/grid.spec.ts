// Session C acceptance (spec/03 §4.5 and spec/19 §10): the hours grid and the
// findings panel on the fixture data.
//
// The two numbers this file exists for:
//   1. twelve workers times five days, typed with the keyboard only, under four
//      minutes (spec/03 §4.5);
//   2. focus never ends up under the sticky header (WCAG 2.4.11), which axe
//      does not catch, so it is measured here in pixels.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const PROJECT = '01924000-0000-7000-8000-000000000001'
const OPEN_WEEK = `/app/hudson-electric/projects/${PROJECT}/weeks/2026-09-12`
const REVIEW_WEEK = `/app/hudson-electric/projects/${PROJECT}/weeks/2026-09-05`

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  // The console says "404" without saying what; name the resource, or the next
  // person spends an afternoon guessing.
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`)
  })
  return errors
}

test('the week spec/19 §4 seeded: 3 errors and 3 warnings, no console or a11y errors', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto(REVIEW_WEEK)

  const panel = page.getByRole('complementary')
  await expect(panel).toContainText('3 errors, 3 warnings')
  await expect(panel).toContainText('Errors block generating the report.')

  // Every message comes from core/validate, never from the component (spec/07 §1).
  await expect(panel.getByText(/has no address; the NY file needs one/)).toBeVisible()
  await expect(panel.getByText(/A day has 24/)).toBeVisible()

  // A blocking finding disables the one primary action (spec/07 §4).
  const generate = page.getByRole('button', { name: 'Review and generate' })
  await expect(generate).toBeDisabled()

  // spec/19 §10 item 8: one screenshot per route, regenerated with the suite so
  // it can never drift from what the screen actually looks like.
  await page.screenshot({ path: '../../docs/screens/app-t-projects-id-weeks-we.png' })

  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  expect(errors).toEqual([])
})

test('the wide screen shows the hours and hides the per worker cards', async ({ page }) => {
  await page.goto(REVIEW_WEEK)

  // Monday of that week, the first row: the fixtures carry eight hours, and
  // they have to be readable, not just present in the DOM.
  await expect(page.locator('#cell-0-1')).toHaveValue('8')
  await expect(page.locator('#cell-0-1')).toBeVisible()
  const cell = await page.locator('#cell-0-1').evaluate((el) => {
    const style = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: Math.round(rect.x),
      color: style.color,
      fontSize: style.fontSize,
      visibility: style.visibility,
    }
  })
  console.log(`cell 0-1 ${JSON.stringify(cell)}`)
  expect(cell.height).toBeGreaterThan(12)
  expect(cell.width).toBeGreaterThan(30)

  // A day column is 64 px (spec/14 §7), of which 8 px on each side is the cell
  // padding. Wider than that and seven days stop fitting, which is how the
  // hours ended up off the screen once already.
  const column = await page
    .locator('#cell-0-1')
    .evaluate((el) => Math.round(el.closest('td')?.getBoundingClientRect().width ?? 0))
  console.log(`day column ${column} px`)
  expect(column).toBeGreaterThan(56)
  expect(column).toBeLessThan(72)
  // Under 900 px the grid becomes a list per worker; above it, never (spec/14 §6).
  await expect(page.locator('.grid-cards')).toBeHidden()

  const size = await page
    .locator('.grid-scroll')
    .evaluate((el) => ({ scroll: el.scrollWidth, visible: el.clientWidth }))
  console.log(`grid is ${size.scroll} px wide in a ${size.visible} px window`)
})

test('clicking a finding focuses the cell it is about', async ({ page }) => {
  await page.goto(REVIEW_WEEK)
  await page.getByRole('button', { name: /A day has 24/ }).click()
  const focused = page.locator('input:focus')
  await expect(focused).toHaveCount(1)
  await expect(focused).toHaveAttribute('id', /^cell-/)
})

test('main action: twelve workers times five days with the keyboard only, under four minutes', async ({
  page,
}) => {
  await page.goto(OPEN_WEEK)
  await page.locator('#cell-0-1').waitFor()

  const started = Date.now()
  // Down a column of days, worker by worker: Enter moves down, Tab moves right.
  for (let day = 1; day <= 5; day++) {
    await page.locator(`#cell-0-${day}`).focus()
    for (let row = 0; row < 12; row++) {
      await page.keyboard.type('8')
      await page.keyboard.press('Enter')
    }
  }
  const seconds = Math.round((Date.now() - started) / 1000)
  // The measurement is the point of this test: spec/03 §4.5 asks for a number.
  console.log(`60 cells typed with the keyboard in ${seconds} s`)
  expect(seconds).toBeLessThan(240)

  await expect(page.getByText('Saving...').or(page.getByText(/^Saved /))).toBeVisible()
})

test('focus never ends under the sticky header (WCAG 2.4.11, spec/19 §10 item 5)', async ({
  page,
}) => {
  await page.goto(OPEN_WEEK)
  await page.locator('#cell-0-1').focus()

  const headerBottom = await page
    .locator('.grid thead')
    .evaluate((el) => el.getBoundingClientRect().bottom)

  // Arrow down through every row and check the focused cell each time.
  for (let row = 0; row < 12; row++) {
    await page.keyboard.press('ArrowDown')
    const box = await page.locator('input:focus').evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top, bottom: rect.bottom }
    })
    expect(box.top).toBeGreaterThanOrEqual(headerBottom - 1)
  }
})

test('a signed week is read only and offers a correction (spec/19 §7)', async ({ page }) => {
  await page.goto(`/app/hudson-electric/projects/${PROJECT}/weeks/2026-08-29`)
  await expect(page.getByRole('status').filter({ hasText: /was signed on/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create a correction' })).toBeVisible()
  await expect(page.locator('#cell-0-1')).toBeDisabled()
})

test('every state of spec/19 §7 can be shown from the URL', async ({ page }) => {
  for (const [state, text] of [
    ['empty', 'No hours yet for this week'],
    ['error', 'This did not load.'],
    ['forbidden', 'You do not have access to this page.'],
    ['conflict', 'changed this week'],
  ] as const) {
    await page.goto(`${OPEN_WEEK}?state=${state}`)
    await expect(page.getByText(new RegExp(text))).toBeVisible()
  }
  await page.goto(`${OPEN_WEEK}?state=loading`)
  await expect(page.locator('[aria-busy="true"]')).toBeVisible()
})
