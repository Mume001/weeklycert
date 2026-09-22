// Session C acceptance (spec/03 §4.5 and spec/19 §10): the hours grid and the
// findings panel on the fixture data.
//
// The three numbers this file exists for, all of them measured rather than
// estimated, which is what spec/19 §10 item 9 asks of every figure in 03:
//   1. twelve workers times five days, typed with the keyboard only, under four
//      minutes (spec/03 §4.5);
//   2. the findings panel refreshed under 300 ms after an entry (spec/03 §4.5);
//   3. focus never ends up under the sticky header (WCAG 2.4.11), which axe
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
  // The panel is a permanent column from 1600 px up (spec/19 §6); the overlay
  // below that width has its own test.
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto(REVIEW_WEEK)

  // The payroll number in the header is the one this week will get, from the
  // data (spec/04 §7.1). It used to be typed into the page.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'payroll no. will be #22 on signature',
  )

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

test('the marketing hero gets a real screenshot of the grid (spec/16 §4 row 2)', async ({
  page,
}) => {
  // spec/19 §8 item 4 forbids a picture of a product that does not exist, and
  // 19 §10 says the hero can carry a real screenshot from session C onwards.
  // It is generated here, with the suite, so it can never drift from the
  // product: the day the grid changes, this file changes with it.
  // Tall enough that the whole week fits: .grid-scroll is capped at the window
  // height, so a short window slices the last row and drops the totals, and a
  // grid cut off mid-row is the one thing a hero image must not be. Narrow
  // enough that the grid fills the frame instead of trailing off into white.
  await page.setViewportSize({ width: 1180, height: 1220 })
  await page.goto(REVIEW_WEEK)
  await page.locator('#cell-0-1').waitFor()
  await page.locator('.grid-frame').screenshot({ path: '../site/public/hero-grid.png' })
})

test('clicking a finding focuses the cell it is about', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
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

test('under 1600 px the counter opens the panel and Escape closes it (spec/19 §6)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(REVIEW_WEEK)

  // No permanent column at this width: the grid needs the room.
  await expect(page.getByRole('complementary')).toBeHidden()

  const counter = page.getByRole('button', { name: /3 errors, 3 warnings/ })
  await counter.click()
  const panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('Errors block generating the report.')

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  // Focus goes back to what opened it, like the navigation panel (spec/14 §6).
  await expect(counter).toBeFocused()
})

test('the grid fits 1366 px with the panel closed (spec/19 §6)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto(OPEN_WEEK)
  await page.locator('#cell-0-1').waitFor()

  // 220 worker + 7 x 64 days + 3 x 80 totals = 908 px, and the derived columns
  // are folded away at this width. If this fails the week cannot be typed
  // without scrolling sideways, which is how it was before.
  const size = await page
    .locator('.grid-scroll')
    .evaluate((el) => ({ scroll: el.scrollWidth, visible: el.clientWidth }))
  console.log(`1366 px: grid is ${size.scroll} px in ${size.visible} px of room`)
  expect(size.scroll).toBeLessThanOrEqual(size.visible)

  // Opened, they come back and sideways scrolling is fine: now it is reading,
  // not typing (spec/03 §4.5).
  await page.getByRole('button', { name: 'Show rates and gross' }).click()
  const opened = await page
    .locator('.grid-scroll')
    .evaluate((el) => ({ scroll: el.scrollWidth, visible: el.clientWidth }))
  expect(opened.scroll).toBeGreaterThan(size.scroll)
})

test('a value typed into a cell is still there after a refresh (spec/03 §4.5)', async ({
  page,
}) => {
  await page.goto(OPEN_WEEK)
  // Saturday: the keyboard test above types Monday to Friday, and both run
  // against the same server.
  const cell = page.locator('#cell-1-6')
  await cell.waitFor()
  await cell.fill('6')
  await page.keyboard.press('Enter')

  // Autosave is debounced 800 ms and never fails silently (spec/19 §6).
  await expect(page.getByText(/^Saved /)).toBeVisible()

  await page.reload()
  await expect(page.locator('#cell-1-6')).toHaveValue(/^6(\.0+)?$/)
})

test('below 900 px the grid becomes a list per worker (spec/14 §6)', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto(REVIEW_WEEK)

  await expect(page.locator('.grid-cards')).toBeVisible()
  await expect(page.locator('.grid-scroll')).toBeHidden()
  // Entering hours on a phone is not supported, only reading (spec/19 §6).
  await expect(page.locator('#cell-0-1')).toBeHidden()
  // The name is in the table too, which is hidden, so ask the cards for it.
  await expect(page.locator('.grid-cards').getByText('Alvarez, Miguel')).toBeVisible()
})

test('a signed week is read only and offers a correction (spec/19 §7)', async ({ page }) => {
  await page.goto(`/app/hudson-electric/projects/${PROJECT}/weeks/2026-08-29`)
  await expect(page.getByRole('status').filter({ hasText: /was signed on/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create a correction' })).toBeVisible()
  await expect(page.locator('#cell-0-1')).toBeDisabled()
})

test('the findings panel refreshes under 300 ms after an entry (spec/03 §4.5)', async ({
  page,
}) => {
  // The number decays quietly: the engine grows, the validation grows, and the
  // limit stays where it is, so nothing tells you it slipped unless this runs.
  // Measured inside the page, between the key that commits the cell and the
  // moment the panel's own text changes. Measuring from the test process would
  // measure the browser protocol instead.
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto(REVIEW_WEEK)
  // The payroll number in the header is the one this week will get, from the
  // data (spec/04 §7.1). It used to be typed into the page.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'payroll no. will be #22 on signature',
  )

  const panel = page.getByRole('complementary')
  await expect(panel).toContainText('3 errors, 3 warnings')

  await page.evaluate(() => {
    const marks = window as unknown as { entryAt?: number; panelAt?: number }
    const cell = document.getElementById('cell-0-6')
    if (!cell) throw new Error('no cell to type into')
    cell.addEventListener(
      'keydown',
      (event) => {
        if ((event as KeyboardEvent).key === 'Enter') marks.entryAt = performance.now()
      },
      // Capture, so the clock starts before React's own handler runs.
      { capture: true },
    )
    const summary = document.querySelector('aside[aria-label] p[aria-live="polite"]')
    if (!summary) throw new Error('no findings panel')
    new MutationObserver(() => {
      if (marks.entryAt !== undefined && marks.panelAt === undefined) {
        marks.panelAt = performance.now()
      }
    }).observe(summary, { childList: true, characterData: true, subtree: true })
  })

  // Saturday of the first row is empty in the fixtures. Twenty hours in one day
  // is over sixteen and under twenty-four, so exactly one soft finding appears
  // and the counter has to move from three warnings to four.
  await page.locator('#cell-0-6').fill('20')
  await page.locator('#cell-0-6').press('Enter')
  await expect(panel).toContainText('3 errors, 4 warnings')

  const ms = await page.evaluate(() => {
    const marks = window as unknown as { entryAt?: number; panelAt?: number }
    if (marks.entryAt === undefined || marks.panelAt === undefined) return -1
    return marks.panelAt - marks.entryAt
  })
  console.log(`findings panel refreshed ${Math.round(ms)} ms after the entry`)
  expect(ms).toBeGreaterThanOrEqual(0)
  expect(ms).toBeLessThan(300)

  // Put the week back the way the fixtures have it: every test on this run
  // shares one server, and two of them read this week's counter.
  await page.locator('#cell-0-6').fill('')
  await page.locator('#cell-0-6').press('Enter')
  await expect(panel).toContainText('3 errors, 3 warnings')
  await expect(page.getByText(/^Saved /)).toBeVisible()
})

test('every header sits over its own column, and the table fills its width', async ({ page }) => {
  // The picture in the marketing hero is this screen, so a column that drifts
  // away from its heading is on the front page too (16 §4 row 2). It drifted
  // for a plain reason: `grid` is a Tailwind utility as well as our class, and
  // the table was rendering as a CSS grid, with the header and the body sizing
  // their columns separately.
  await page.setViewportSize({ width: 1180, height: 1220 })
  await page.goto(REVIEW_WEEK)
  await page.locator('#cell-0-1').waitFor()

  const columns = await page.locator('table.grid').evaluate((table) => {
    const shown = (nodes: Element[]) =>
      nodes.filter((node) => getComputedStyle(node).display !== 'none')
    const box = (node: Element) => {
      const rect = node.getBoundingClientRect()
      return [Math.round(rect.left), Math.round(rect.right)]
    }
    const head = shown([...table.querySelectorAll('thead th')])
    const body = shown([...table.querySelectorAll('tbody tr:first-child > *')])
    const foot = shown([...table.querySelectorAll('tfoot tr > *')])
    return head.map((cell, index) => ({
      label: cell.textContent?.trim() ?? '',
      head: box(cell),
      body: body[index] ? box(body[index] as Element) : null,
      foot: foot[index] ? box(foot[index] as Element) : null,
    }))
  })

  // Worker, seven days, Total, ST and OT with the derived columns folded away.
  expect(columns).toHaveLength(11)
  for (const column of columns) {
    expect(column.body, `${column.label} body`).toEqual(column.head)
    expect(column.foot, `${column.label} totals`).toEqual(column.head)
  }

  // And no band of empty table to the right of the last column.
  const edges = await page.locator('table.grid').evaluate((table) => {
    const row = table.querySelector('tbody tr:first-child')
    return {
      row: Math.round((row as Element).getBoundingClientRect().right),
      table: Math.round(table.getBoundingClientRect().right),
    }
  })
  expect(edges.row).toBe(edges.table)
})

test('the two weights above the fold are preloaded (spec/19 §8)', async ({ page, request }) => {
  await page.goto(OPEN_WEEK)

  const preloaded = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
  // 400 carries the hours, 600 the headings and the buttons (spec/14 §4).
  expect(preloaded.filter((href) => /ibm-plex-sans-400-latin\./.test(href))).toHaveLength(1)
  expect(preloaded.filter((href) => /ibm-plex-sans-600-latin\./.test(href))).toHaveLength(1)

  const sheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
  const css = await Promise.all(sheets.map(async (href) => (await request.get(href)).text()))

  for (const href of preloaded) {
    expect((await request.get(href)).status(), href).toBe(200)
    // A preload of a file the stylesheet does not ask for is worse than none:
    // the font is fetched twice and neither fetch is early.
    const file = href.split('/').pop() ?? ''
    expect(
      css.some((text) => text.includes(file)),
      `${file} is preloaded but the stylesheet asks for a different file`,
    ).toBe(true)
  }
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
