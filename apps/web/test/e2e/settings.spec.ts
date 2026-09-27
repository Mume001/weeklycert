// Session L acceptance (spec/20 L, spec/03 §4.9, spec/02 §3 and §5): the seven
// settings pages on the fixture data. Every test puts back what it changed,
// because the mock keeps the company in the server's memory.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const APP = '/app/hudson-electric'
const S = `${APP}/settings`
const PAGES = ['company', 'team', 'signers', 'billing', 'notifications', 'audit', 'data'] as const

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

const sections = (page: Page) => page.getByRole('navigation', { name: 'Settings sections' })

test('every page for the owner, with no console or a11y errors, and a screenshot', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors = collectErrors(page)
  for (const name of PAGES) {
    await page.goto(`${S}/${name}`)
    await expect(sections(page).getByRole('link')).toHaveCount(7)
    await expect(sections(page).locator('[aria-current="page"]')).toHaveAttribute(
      'href',
      `${S}/${name}`,
    )
    await page.screenshot({ path: `../../docs/screens/app-t-settings-${name}.png`, fullPage: true })
    await expectNoSeriousA11y(page)
  }
  expect(errors).toEqual([])
})

test('the main action: invite someone, see it waiting, revoke it', async ({ page }) => {
  await page.goto(`${S}/team`)
  await expect(page.getByTestId('member-row')).toHaveCount(6)
  const email = page.getByLabel('Email')
  await email.fill('not an email')
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('Enter an email address.')).toBeVisible()
  await email.fill('viewer@hudson-electric.test')
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('This person is already on the team.')).toBeVisible()

  await email.fill('Estimator@Hudson-Electric.test')
  await page.getByLabel('Role', { exact: true }).last().selectOption('viewer')
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('Invitation sent to estimator@hudson-electric.test.')).toBeVisible()
  const waiting = page.getByTestId('invitation-row')
  await expect(waiting).toHaveCount(1)
  // Seven days from the mock's today (04 invitations).
  await expect(waiting).toContainText('Sep 22, 2026')
  await waiting.getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByText('No invitations waiting.')).toBeVisible()
})

test('a role changes and changes back; the owner row cannot', async ({ page }) => {
  await page.goto(`${S}/team`)
  const greg = page.getByTestId('member-row').filter({ hasText: 'Greg Hollis' })
  await greg.getByLabel('Role').selectOption('payroll')
  await expect(greg.getByText('Role changed.')).toBeVisible()
  await greg.getByLabel('Role').selectOption('viewer')
  await expect(greg.getByLabel('Role')).toHaveValue('viewer')
  const owner = page.getByTestId('member-row').filter({ hasText: 'Mirza Hodzic' })
  await expect(owner.getByLabel('Role')).toHaveCount(0)
  await expect(owner).toContainText('The owner cannot be changed here.')
  await expect(owner.getByRole('button', { name: 'Remove' })).toHaveCount(0)
})

test('billing: pause and unpause; cancel through the three steps, then keep it', async ({
  page,
}) => {
  await page.goto(`${S}/billing`)
  await expect(page.getByTestId('billing-status')).toHaveText('Active')
  await expect(page.getByText('Next charge Oct 1, 2026.', { exact: false })).toBeVisible()
  await expect(page.getByText('Standard, $299, paid Apr 1, 2026')).toBeVisible()

  await page.getByRole('button', { name: 'Pause for the winter' }).click()
  await page.getByLabel('Resume after').selectOption('1')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByText('Paused until Oct 15, 2026.')).toBeVisible()
  await page.getByRole('button', { name: 'Unpause now' }).click()
  await expect(page.getByTestId('billing-status')).toHaveText('Active')

  await page.getByRole('button', { name: 'Cancel subscription' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Pick a reason.')).toBeVisible()
  await page.getByLabel('No public work right now').check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('link', { name: 'Export everything now' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Cancel at the end of the period' }).click()
  const dialog = page.getByRole('dialog')
  const confirm = dialog.getByRole('button', { name: 'Cancel at the end of the period' })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill('Hudson Electric LLC')
  await confirm.click()
  await expect(
    page.getByText(
      'Your subscription ends on Oct 1, 2026. After that you keep read-only access and full export for 30 days.',
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Keep my subscription' }).click()
  await expect(page.getByRole('button', { name: 'Cancel subscription' })).toBeVisible()
})

test('notifications: who gets what is saved; text messages need the consent', async ({ page }) => {
  await page.goto(`${S}/notifications`)
  const dana = page.getByTestId('recipient-row').filter({ hasText: 'Dana Kowalski' })
  const deadline = dana.getByRole('checkbox', { name: 'Deadline reminders' })
  await expect(deadline).toBeChecked()
  await deadline.uncheck()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Notifications saved.')).toBeVisible()
  await page.reload()
  await expect(deadline).not.toBeChecked()
  await deadline.check()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Notifications saved.')).toBeVisible()

  await expect(page.getByTestId('sms-state')).toHaveText(
    'Off. Text messages need written consent first.',
  )
  await page.getByLabel('Mobile number').fill('845 555 0101')
  await page.getByRole('button', { name: 'Turn on text messages' }).click()
  await expect(
    page.getByText('Check the box to give consent, or leave text messages off.'),
  ).toBeVisible()
  await page.getByRole('checkbox', { name: /^I agree to receive text messages/ }).check()
  await page.getByRole('button', { name: 'Turn on text messages' }).click()
  await expect(page.getByTestId('sms-state')).toContainText('(845) 555-0101')
  await expect(page.getByTestId('sms-state')).toContainText('Consent recorded on Sep 15, 2026.')
  await page.getByRole('button', { name: 'Turn off text messages' }).click()
  await expect(page.getByTestId('sms-state')).toHaveText(
    'Off. Text messages need written consent first.',
  )
})

test('audit log: filtered by kind, and the CSV', async ({ page }) => {
  await page.goto(`${S}/audit`)
  await page.getByLabel('Kind').selectOption('signature')
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page).toHaveURL(/kind=signature/)
  const rows = page.getByTestId('audit-row')
  expect(await rows.count()).toBeGreaterThan(0)
  for (const text of await rows.allTextContents()) expect(text).toContain('Signature')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('weeklycert-audit-log.csv')
  const text = Buffer.concat(await (await download.createReadStream()).toArray()).toString()
  expect(text.split('\r\n')[0]).toBe('When,Person,What,Detail')
})

test('your data: the export, and a deletion that asks for the name first', async ({ page }) => {
  await page.goto(`${S}/data`)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Export everything' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('weeklycert-export-hudson-electric.zip')
  const bytes = Buffer.concat(await (await download.createReadStream()).toArray())
  expect(bytes.subarray(0, 2).toString()).toBe('PK')

  await page.getByRole('button', { name: 'Delete the company' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete Hudson Electric LLC?' })
  await expect(dialog.getByRole('button', { name: 'Delete the company' })).toBeDisabled()
  await dialog.getByRole('textbox').fill('Hudson')
  await expect(dialog.getByRole('button', { name: 'Delete the company' })).toBeDisabled()
  // Not confirmed: the company stays (the deletion itself is in the data tests).
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('each role sees only its pages (02 §5), and the rest are refused', async ({ page }) => {
  await page.goto(`${S}/company`)
  await switchRole(page, 'Payroll')
  await page.goto(`${S}/company`)
  await expect(sections(page).getByRole('link')).toHaveText(['Company', 'Notifications'])
  await expect(
    page.getByText('Only the owner or an administrator can change the company profile.'),
  ).toBeVisible()
  await expect(page.getByLabel('Legal name')).toBeDisabled()
  await page.goto(`${S}/notifications`)
  await expect(page.getByTestId('recipient-row')).toHaveCount(1)
  await page.goto(`${S}/team`)
  await expect(page.getByText('You do not have access to this page.')).toBeVisible()
  // Not only hidden: the export refuses payroll too.
  expect((await page.request.get('/api/files/export%3Aall?t=hudson-electric')).status()).toBe(403)

  await switchRole(page, 'Administrator')
  await page.goto(`${S}/company`)
  await expect(sections(page).getByRole('link')).toHaveText([
    'Company',
    'Team',
    'Signers',
    'Notifications',
    'Audit log',
  ])
  await page.goto(`${S}/billing`)
  await expect(page.getByText('You do not have access to this page.')).toBeVisible()
  await page.goto(`${S}/signers`)
  await expect(page.getByRole('checkbox', { name: 'May sign in this company' })).toBeDisabled()

  await switchRole(page, 'Viewer')
  await page.goto(`${S}/company`)
  await expect(page.getByText('You do not have access to this page.')).toBeVisible()
  await switchRole(page, 'Owner')
})

test('loading, empty, error, forbidden and locked from ?state=', async ({ page }) => {
  for (const name of PAGES) {
    const url = `${S}/${name}`
    await page.goto(`${url}?state=loading`)
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
    await page.goto(`${url}?state=error`)
    await expect(page.getByText('This did not load.')).toBeVisible()
    await page.goto(`${url}?state=forbidden`)
    await expect(page.getByText('You do not have access to this page.')).toBeVisible()
    await page.goto(`${url}?state=locked`)
    await expect(
      page.getByText(/^Paused\. You can read and export everything\./).first(),
    ).toBeVisible()
    await page.goto(`${url}?state=empty`)
    await expect(sections(page)).toBeVisible()
  }
  await page.goto(`${S}/team?state=empty`)
  await expect(page.getByText('0 people')).toBeVisible()
  await page.goto(`${S}/signers?state=empty`)
  await expect(
    page.getByText('No signers yet. Add the person who signs the certification.'),
  ).toBeVisible()
  await page.goto(`${S}/audit?state=empty`)
  await expect(page.getByText('Nothing matches these filters.')).toBeVisible()
})
