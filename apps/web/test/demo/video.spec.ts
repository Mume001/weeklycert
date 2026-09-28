// The demo video (spec/20 O, 12 step 3, 16 §4): 90 seconds, no sound, with
// captions in the picture, recorded from the mock build. The captions are the
// seven lines of 15 §3 "Demo video", from packages/copy. It walks one week:
// hours in, checks, review, draft and signature, the filing, the dashboard.
import { copyFileSync, mkdirSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { copy } from '@wc/copy'

const APP = '/app/hudson-electric'
const WEEK = `${APP}/projects/01924000-0000-7000-8000-000000000001/weeks/2026-09-12`
const OUT = '../../docs/demo/weeklycert-demo.webm'
const lines = copy.site.demoVideo

/** A caption strip at the bottom of the picture; a new page keeps it on. */
async function caption(page: Page, index: number) {
  const text = lines[index] ?? ''
  await page.evaluate((line) => {
    let el = document.getElementById('demo-caption')
    if (!el) {
      el = document.createElement('div')
      el.id = 'demo-caption'
      el.setAttribute('aria-hidden', 'true')
      Object.assign(el.style, {
        position: 'fixed',
        left: '50%',
        bottom: '28px',
        transform: 'translateX(-50%)',
        maxWidth: '900px',
        padding: '12px 20px',
        borderRadius: '10px',
        background: 'rgba(16, 24, 40, 0.88)',
        color: 'white',
        font: '600 20px/1.35 "IBM Plex Sans", system-ui, sans-serif',
        textAlign: 'center',
        zIndex: '2147483647',
        pointerEvents: 'none',
      })
      document.body.appendChild(el)
    }
    el.textContent = line
  }, text)
}

/** Go somewhere and put the caption back on the new page. */
async function visit(page: Page, url: string, index: number) {
  await page.goto(url)
  await caption(page, index)
}

const pause = (page: Page, ms: number) => page.waitForTimeout(ms)

test('the 90-second demo', async ({ page }) => {
  // 1. The week (about 12 s).
  await visit(page, WEEK, 0)
  await expect(page.locator('#cell-0-5')).toBeVisible()
  await pause(page, 11_000)

  // 2. Hours in; ten on Friday splits into straight time and overtime (about 13 s).
  await caption(page, 1)
  const friday = page.locator('#cell-0-5')
  await friday.click()
  await pause(page, 1_500)
  await friday.fill('10')
  await friday.press('Enter')
  await expect(page.getByText(/^Saved /)).toBeVisible()
  await pause(page, 10_000)

  // 3. A check as you type: 25 hours in a day blocks, then it is fixed (about 14 s).
  await caption(page, 2)
  const saturday = page.locator('#cell-0-6')
  await saturday.fill('25')
  await saturday.press('Enter')
  await pause(page, 6_000)
  await saturday.fill('')
  await saturday.press('Enter')
  await expect(page.getByText(/^Saved /)).toBeVisible()
  await pause(page, 6_000)

  // 4. The review (about 12 s).
  await visit(page, `${WEEK}/review`, 3)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Review and certify')
  await page.mouse.wheel(0, 500)
  await pause(page, 11_000)

  // 5. Draft, then the signature (about 16 s).
  await page.mouse.wheel(0, -2000)
  await caption(page, 4)
  await page.getByRole('button', { name: 'Generate the draft' }).click()
  await expect(page.getByText(/Draft v1 is ready\./)).toBeVisible({ timeout: 20_000 })
  await pause(page, 3_000)
  await visit(page, `${WEEK}/sign`, 4)
  await page.getByLabel('I understand what I am signing.').check()
  await page.getByLabel('Re-enter your password or two-factor code').fill('demo')
  await pause(page, 2_000)
  await page.getByRole('button', { name: 'Sign and lock this week' }).click()
  await expect(page).toHaveURL(`${WEEK}/reports`)
  await caption(page, 4)
  await pause(page, 6_000)

  // 6. The filing (about 12 s).
  await caption(page, 5)
  await page.getByLabel('Confirmation number').fill('A870412')
  await pause(page, 1_500)
  await page.getByRole('button', { name: 'Record submission' }).click()
  await expect(page.getByText('A870412')).toBeVisible()
  await pause(page, 9_000)

  // 7. The dashboard, and the last line (about 11 s).
  await visit(page, `${APP}/dashboard`, 6)
  await pause(page, 11_000)

  const video = page.video()
  await page.close()
  if (!video) throw new Error('no video recorded')
  mkdirSync('../../docs/demo', { recursive: true })
  copyFileSync(await video.path(), OUT)
})
