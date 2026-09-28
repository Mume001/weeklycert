// Session M acceptance (spec/20 M, spec/03 §4.1 and §4.2, spec/11 §3): sign-in
// and the account on the mock. The forms only navigate; a sign-in sets the
// demo role, so each test's fresh browser starts as the owner again.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

async function expectNoSeriousA11y(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze()
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

const FAILED = 'That email and password do not match. Check both, or use a sign-in link instead.'

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('a wrong password and an unknown email get the same sentence', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in to WeeklyCert')
  await page.screenshot({ path: '../../docs/screens/login.png', fullPage: true })
  await expectNoSeriousA11y(page)
  await signIn(page, 'payroll@hudson-electric.test', 'wrong')
  await expect(page.getByRole('alert').filter({ hasText: FAILED })).toHaveText(FAILED)
  await signIn(page, 'nobody@example.test', 'demo')
  await expect(page.getByRole('alert').filter({ hasText: FAILED })).toHaveText(FAILED)
})

test('the main action: sign in, with the two-factor code where the role needs it', async ({
  page,
}) => {
  await page.goto('/login')
  await signIn(page, 'payroll@hudson-electric.test', 'demo')
  await expect(page).toHaveURL('/app/hudson-electric/dashboard')
  await expect(page.getByRole('button', { name: 'Viewing as Payroll' })).toBeVisible()

  await page.goto('/login')
  await signIn(page, 'signer@hudson-electric.test', 'demo')
  await expect(page).toHaveURL('/2fa')
  await expectNoSeriousA11y(page)
  await page.getByLabel('Code').fill('12345')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(
    page.getByText('That code does not match. Check the app and try again.'),
  ).toBeVisible()
  await page.getByLabel('Code').fill('123456')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).toHaveURL('/app/hudson-electric/dashboard')
  await expect(page.getByRole('button', { name: 'Viewing as Signer' })).toBeVisible()
})

test('two-factor without the password first goes back to sign-in', async ({ page }) => {
  await page.goto('/2fa')
  await expect(page).toHaveURL('/login')
})

test('the magic link: opening it uses nothing, the click does, once', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('payroll@hudson-electric.test')
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await expect(
    page.getByText(
      /^If payroll@hudson-electric\.test has an account, a sign-in link is on its way\./,
    ),
  ).toBeVisible()
  const link = await page.getByRole('link', { name: 'Open the link' }).getAttribute('href')
  if (!link) throw new Error('no link')
  // A mail scanner opens it twice: nothing is used.
  await page.goto(link)
  await page.goto(link)
  await expect(page.getByRole('button', { name: 'Sign me in' })).toBeVisible()
  await expectNoSeriousA11y(page)
  await page.getByRole('button', { name: 'Sign me in' }).click()
  await expect(page).toHaveURL('/app/hudson-electric/dashboard')
  await page.goto(link)
  await expect(page.getByText('This link has expired or was already used.')).toBeVisible()
})

test('register: the errors, then the email to confirm first', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Create account' }).click()
  for (const text of [
    'Enter your name.',
    'Enter your email address.',
    'Use at least 12 characters.',
    'Accept the terms to continue.',
  ]) {
    await expect(page.getByText(text)).toBeVisible()
  }
  await page.getByLabel('Your name').fill('Ana Lee')
  await page.getByLabel('Work email').fill('owner@hudson-electric.test')
  await page.getByLabel('Password').fill('a long enough password')
  await page.getByLabel('Company name').fill('Lee Electric LLC')
  await expect(page.getByLabel('State')).toHaveValue('New York')
  await page.getByLabel(/^I agree to the Terms of Service/).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('There is already an account with this email.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in instead' })).toBeVisible()
  await page.screenshot({ path: '../../docs/screens/register.png', fullPage: true })
  await expectNoSeriousA11y(page)

  await page.getByLabel('Work email').fill('ana@lee-electric.test')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  const verify = await page.getByRole('link', { name: 'Open the link' }).getAttribute('href')
  if (!verify) throw new Error('no link')

  // Not confirmed yet: sign-in says so and offers the link again.
  await page.goto('/login')
  await signIn(page, 'ana@lee-electric.test', 'demo')
  await expect(
    page.getByText('Confirm your email first. We sent a link to ana@lee-electric.test.'),
  ).toBeVisible()

  await page.goto(verify)
  await page.getByRole('button', { name: 'Confirm my email' }).click()
  await expect(page.getByText('Your email is confirmed.')).toBeVisible()
})

test('an invitation: who invites, and a registration without a company', async ({ page }) => {
  await page.goto('/app/hudson-electric/settings/team')
  await page.getByLabel('Email').fill('crew@hudson-electric.test')
  await page.getByRole('button', { name: 'Send invitation' }).click()
  const row = page.getByTestId('invitation-row')
  await expect(row).toHaveCount(1)
  const id = (await row.locator('td').first().getAttribute('id'))?.replace(/^invite-/, '')
  if (!id) throw new Error('no invitation')

  await page.goto(`/invite/${id}`)
  await expect(
    page.getByText(
      'Mirza Hodzic invited you to Hudson Electric LLC as Payroll. Accepting adds this company to your account.',
    ),
  ).toBeVisible()
  await expect(
    page.getByText(
      'This invitation is for crew@hudson-electric.test. Sign in with that address to accept it.',
    ),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL(`/register?invite=${id}`)
  await expect(
    page.getByText('You are joining Hudson Electric LLC. No new company is created.'),
  ).toBeVisible()
  await expect(page.getByLabel('Company name')).toHaveCount(0)
  await expect(page.getByLabel('Work email')).toHaveValue('crew@hudson-electric.test')

  // The team as it was.
  await page.goto('/app/hudson-electric/settings/team')
  await page.getByTestId('invitation-row').getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByText('No invitations waiting.')).toBeVisible()
})

test('a new password through the emailed link, used once', async ({ page }) => {
  await page.goto('/forgot')
  await page.getByLabel('Email').fill('payroll@hudson-electric.test')
  await page.getByRole('button', { name: 'Email me a reset link' }).click()
  const link = await page.getByRole('link', { name: 'Open the link' }).getAttribute('href')
  if (!link) throw new Error('no link')
  await page.goto(link)
  await page.getByLabel('New password').fill('short')
  await page.getByRole('button', { name: 'Save new password' }).click()
  await expect(page.getByText('Use at least 12 characters.')).toBeVisible()
  await page.getByLabel('New password').fill('a much longer password')
  await page.getByRole('button', { name: 'Save new password' }).click()
  await expect(
    page.getByText('Your password is changed, and every other session is signed out.'),
  ).toBeVisible()
  await page.goto(link)
  await expect(page.getByText('This link has expired or was already used.')).toBeVisible()
})

test('the account and its security', async ({ page }) => {
  await page.goto('/account')
  await expect(page.getByLabel('Name')).toHaveValue('Mirza Hodzic')
  await page.getByLabel('Email').fill('mirza@hudson-electric.test')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.getByText(
      'We sent a confirmation link to mirza@hudson-electric.test. The change takes effect when you open it.',
    ),
  ).toBeVisible()
  await page.screenshot({ path: '../../docs/screens/account.png', fullPage: true })
  await expectNoSeriousA11y(page)

  await page.goto('/account/security')
  await expect(page.getByTestId('two-factor-state')).toHaveText('OnRequired for your role.')
  await page.getByLabel('Current password').fill('wrong')
  await page.getByLabel('New password').fill('a much longer password')
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('The current password does not match.')).toBeVisible()
  const sessions = page.getByTestId('session-row')
  await expect(sessions).toHaveCount(2)
  await page.screenshot({ path: '../../docs/screens/account-security.png', fullPage: true })
  await expectNoSeriousA11y(page)
  await page.getByRole('button', { name: 'Sign out everywhere' }).click()
  await expect(page.getByText('Signed out everywhere else.')).toBeVisible()
  await expect(sessions).toHaveCount(1)
  await expect(sessions).toContainText('This device')
})

test('loading, error, locked and an expired link from ?state=', async ({ page }) => {
  for (const url of ['/login', '/register', '/forgot', '/account', '/account/security']) {
    await page.goto(`${url}?state=loading`)
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
    await page.goto(`${url}?state=error`)
    await expect(page.getByText('This did not load.')).toBeVisible()
  }
  await page.goto('/login?state=locked')
  await expect(
    page.getByText(/^Too many attempts\. Try again at .+, or reset your password\.$/),
  ).toBeVisible()
  await page.goto('/magic/anything?state=empty')
  await expect(page.getByText('This link has expired or was already used.')).toBeVisible()
  await page.goto('/verify/anything')
  await expect(page.getByText('This link has expired or was already used.')).toBeVisible()
  await page.goto('/invite/anything')
  await expect(
    page
      .getByRole('button', { name: 'Send a new link' })
      .or(page.getByRole('link', { name: 'Send a new link' })),
  ).toBeVisible()
})

// A company opens only to its members (session M follow-up): anyone else gets
// the 404 a foreign id gets (spec/11 §6), however they signed in.
const HUDSON = '/app/hudson-electric/dashboard'

async function withCode(page: Page) {
  await expect(page).toHaveURL('/2fa')
  await page.getByLabel('Code').fill('123456')
  await page.getByRole('button', { name: 'Verify' }).click()
}

test('a user with no company lands on /firms, empty, and Hudson is a 404', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Your name').fill('Sam Porter')
  await page.getByLabel('Work email').fill('sam@porter-electric.test')
  await page.getByLabel('Password').fill('a long enough password')
  await page.getByLabel('Company name').fill('Porter Electric LLC')
  await page.getByLabel(/^I agree to the Terms of Service/).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  const verify = await page.getByRole('link', { name: 'Open the link' }).getAttribute('href')
  if (!verify) throw new Error('no link')
  await page.goto(verify)
  await page.getByRole('button', { name: 'Confirm my email' }).click()
  await expect(page.getByText('Your email is confirmed.')).toBeVisible()

  await page.goto('/login')
  await signIn(page, 'sam@porter-electric.test', 'demo')
  await expect(page).toHaveURL('/firms')
  await expect(
    page.getByText('You have no company yet. Create your own, or wait for an invitation.'),
  ).toBeVisible()
  const res = await page.goto(HUDSON)
  expect(res?.status()).toBe(404)
})

test('the platform admin goes to /admin and is no owner of Hudson', async ({ page }) => {
  await page.goto('/login')
  await signIn(page, 'super@weeklycert.test', 'demo')
  await withCode(page)
  await expect(page).toHaveURL('/admin')
  const res = await page.goto(HUDSON)
  expect(res?.status()).toBe(404)
})

test('a member of another company opens only that one; Hudson is a 404', async ({ page }) => {
  await page.goto('/login')
  await signIn(page, 'owner@riverside-mechanical.test', 'demo')
  await withCode(page)
  await expect(page).toHaveURL('/app/riverside-mechanical/dashboard')
  const res = await page.goto(HUDSON)
  expect(res?.status()).toBe(404)
  const firms = await page.goto('/firms')
  expect(firms?.status()).toBe(200)
  await expect(page.getByTestId('firm-card')).toHaveCount(1)
})
