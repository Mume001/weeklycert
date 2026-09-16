// The public site, against the files that actually get uploaded.
//
// spec/19 §10 asks each screen for the same five things, and two of them are
// the reason this file exists rather than a unit test: a screenshot per route,
// and axe with no serious violation. The third is specific to this app: the
// content has to be readable with JavaScript turned off (16 §8), which is a
// property of the built HTML and of nothing else.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const ROUTES = [
  { path: '/', shot: 'site.png' },
  { path: '/pricing', shot: 'site-pricing.png' },
  { path: '/security', shot: 'site-security.png' },
  { path: '/legal/terms', shot: 'site-legal-doc.png' },
] as const

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

for (const route of ROUTES) {
  test(`${route.path} is clean, and looks like itself`, async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(route.path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.screenshot({ path: `../../docs/screens/${route.shot}`, fullPage: true })

    const axe = await new AxeBuilder({ page }).analyze()
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    expect(errors).toEqual([])
  })
}

test.describe('with JavaScript turned off (spec/16 §8)', () => {
  test.use({ javaScriptEnabled: false })

  test('the whole sales argument is still readable', async ({ page }) => {
    await page.goto('/')
    // The headline, the price, and an FAQ answer that a details element hides
    // behind a click: all of it is in the HTML, none of it waits on a script.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'New York certified payroll',
    )
    await expect(page.getByText('$79').first()).toBeVisible()
    await expect(page.getByText(/The state portal has no API/)).toBeAttached()
  })
})

test('the three legal documents exist and nothing else does (spec/19 §2)', async ({ page }) => {
  for (const doc of ['terms', 'privacy', 'dpa']) {
    const response = await page.goto(`/legal/${doc}`)
    expect(response?.status()).toBe(200)
  }
  // generateStaticParams is the whole list, so a fourth name was never built.
  const missing = await page.goto('/legal/cookies')
  expect(missing?.status()).toBe(404)
})

test('the hero carries the real grid and a whole week of it (spec/16 §4 row 2)', async ({
  page,
}) => {
  await page.goto('/')
  const shot = page.getByRole('img').first()
  await expect(shot).toHaveAttribute('src', '/hero-grid.png')
  // The prototype drew six days, Monday to Saturday. The screenshot comes from
  // the running grid, which derives the seven days from the week ending (05 §4),
  // so the count cannot drift back.
  await expect(shot).toHaveAttribute('alt', /seven days/)
})

test('no phone number and no postal address reached the build (spec/19 §8)', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route.path)
    const html = await page.content()
    expect(html).not.toMatch(/\(\d{3}\)\s*\d{3}-\d{4}/)
    expect(html).not.toMatch(/tel:\+?\d/)
    expect(html).not.toMatch(/\b(Casper|Wyoming)\b/)
    // The Bosnian notes and their dashed boxes.
    expect(html).not.toMatch(/[čćžšđ]/i)
  }
})
