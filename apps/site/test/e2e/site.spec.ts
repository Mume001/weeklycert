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

test('the one primary action opens an email, because sign up does not exist yet', async ({
  page,
}) => {
  // spec/19 §10 item 7: one test for the main action of the screen. There is
  // exactly one primary action on this site and it is repeated, never competed
  // with by a "Book a demo" of equal weight.
  //
  // Where it leads is 15 §3 block 14: /register and app.weeklycert.com are
  // built after the gate of ten payments (19 §9), so until then the button says
  // what it does and opens an email instead of promising a screen.
  await page.goto('/')
  const primary = page.getByRole('link', { name: 'Ask for an account' }).first()
  await expect(primary).toHaveAttribute(
    'href',
    'mailto:support@weeklycert.com?subject=Account%20request%20from%20weeklycert.com',
  )
  // And it says so next to itself, rather than letting the visitor find out.
  await expect(page.getByText('Sign up is not open yet').first()).toBeVisible()
})

test('the header carries no Log in until there is something to log in to', async ({ page }) => {
  // 16 §4 row 1: the button comes back the day registration works, pointing at
  // app.weeklycert.com. Until then it is neither a blind link nor an email.
  for (const route of ROUTES) {
    await page.goto(route.path)
    await expect(page.getByRole('link', { name: /log in/i })).toHaveCount(0)
  }
})

test('no link anywhere on the site leads to a page that does not exist', async ({
  page,
  request,
}) => {
  // The rule behind this one is blunt: a call to action that 404s on a site
  // selling compliance software costs more than the sale. Every link on every
  // built page is either an email, a section of a page that exists, or a page
  // that answers 200.
  const checked = new Map<string, number>()
  for (const route of ROUTES) {
    await page.goto(route.path)
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
    expect(hrefs.length).toBeGreaterThan(5)

    for (const href of hrefs) {
      if (href.startsWith('mailto:')) {
        // One inbox, and a subject that says which button was pressed (15 §3).
        expect(href, `${route.path}: ${href}`).toMatch(
          /^mailto:support@weeklycert\.com(\?subject=\S+)?$/,
        )
        continue
      }
      // Nothing on this site links off it, and nothing links to a host that is
      // not built yet either.
      expect(href, `${route.path}: ${href}`).toMatch(/^\/[\w#/-]*$/)

      const [path = '/', fragment] = href.split('#')
      const target = path === '' ? '/' : path
      if (!checked.has(target)) {
        checked.set(target, (await request.get(target)).status())
      }
      expect(checked.get(target), `${route.path} links to ${href}`).toBe(200)

      if (fragment) {
        await page.goto(target)
        await expect(page.locator(`#${fragment}`)).toHaveCount(1)
        await page.goto(route.path)
      }
    }
  }
})

test('a section link does not park its heading under the sticky header', async ({ page }) => {
  // spec/19 §10 item 5, in the shape this app has it: the header is sticky, so
  // an anchor without scroll-padding hides the heading it just jumped to.
  await page.goto('/')
  await page.getByRole('link', { name: 'How it works' }).first().click()
  const headerBottom = await page
    .locator('header')
    .evaluate((el) => el.getBoundingClientRect().bottom)
  const sectionTop = await page.locator('#how').evaluate((el) => el.getBoundingClientRect().top)
  expect(sectionTop).toBeGreaterThanOrEqual(headerBottom - 1)
})

test('the page paints inside the 3G budget (spec/16 §8, 12 step 3b)', async ({ page }) => {
  // The acceptance number for this app: LCP under 1.5 s on 3G, because these
  // customers sit on slow connections. Measured, not assumed.
  //
  // "3G" is Chrome's Fast 3G profile, 1.6 Mbps down with a 562 ms round trip,
  // which is what Lighthouse means by the word. The profile is named here
  // rather than picked to suit the result: on Slow 3G, 400 kbps, this page
  // measures about 8.7 s, and no page carrying a real screenshot of the product
  // can meet 1.5 s there, because the screenshot alone is 1.6 s of transfer.
  // 16 §4 row 2 asks for that screenshot and 16 §8 asks for this budget.
  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 562,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })

  await page.goto('/', { waitUntil: 'load' })
  const measured = await page.evaluate(
    () =>
      new Promise<{ lcp: number; element: string; heavy: string[] }>((resolve) => {
        const report = (lcp: number, element: string) => {
          const heavy = performance
            .getEntriesByType('resource')
            .map((e) => e as PerformanceResourceTiming)
            .sort((a, b) => b.transferSize - a.transferSize)
            .slice(0, 6)
            .map((e) => `${Math.round(e.transferSize / 1024)} kB ${e.name.split('/').pop()}`)
          resolve({ lcp, element, heavy })
        }
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const last = entries[entries.length - 1] as
            | (PerformanceEntry & {
                element?: Element
                url?: string
              })
            | undefined
          if (last) {
            report(last.startTime, last.url || last.element?.tagName || 'unknown')
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        setTimeout(() => report(0, 'timed out'), 5000)
      }),
  )
  const lcp = measured.lcp
  console.log(`LCP on 3G: ${Math.round(lcp)} ms, element: ${measured.element}`)
  console.log(`heaviest: ${measured.heavy.join(' | ')}`)
  expect(lcp).toBeGreaterThan(0)
  expect(lcp).toBeLessThan(1500)
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
