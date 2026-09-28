// Sign-in over the fixtures (spec/03 §4.1, spec/11 §3, spec/19 §4). The forms
// only navigate (spec/20 M): every fixture user signs in with the password
// "demo"; a token for a magic link, an email confirmation or a new password
// lives in memory and is used once. Better Auth replaces all of it in step 4.
import { addDays } from '@wc/core'
import type {
  AccountDTO,
  InvitationDTO,
  RegisterErrorCode,
  RegisterInput,
  SignInResult,
  TokenKind,
  Uuid,
} from '../dto/index.ts'
import { LOCK_MINUTES, SIGN_IN_ATTEMPTS } from '../dto/index.ts'
import { mockNow, mockToday } from './clock.ts'
import { db } from './db.ts'

/** 19 §4: the one password of the demo. */
const DEMO_PASSWORD = 'demo'

/**
 * The demo sign-in works only with DATA_SOURCE=mock, said out loud (19 §4).
 * Every demo shortcut below asks this first, so a real data source can never
 * reach the password "demo" or the six-digit code, even if it called here.
 */
export function demoSignInAllowed(): boolean {
  return process.env.DATA_SOURCE === 'mock'
}

/** The demo's password check: never true outside the mock. */
function demoPassword(password: string): boolean {
  return demoSignInAllowed() && password === DEMO_PASSWORD
}

/** 19 §4: in the demo any six digits pass; outside the mock, none. */
export function verifyTwoFactor(code: string): boolean {
  return demoSignInAllowed() && /^\d{6}$/.test(code.replace(/\s/g, ''))
}

/** The current password on /account/security; the demo's, and only in the mock. */
export function checkPassword(userId: Uuid, password: string): boolean {
  return db.users.some((u) => u.id === userId) && demoPassword(password)
}
const DEMO_TENANT = 'hudson-electric'

const norm = (email: string) => email.trim().toLowerCase()
const userByEmail = (email: string) => db.users.find((u) => u.email === norm(email))

function roleInDemo(userId: Uuid) {
  const tenant = db.tenants.find((t) => t.slug === DEMO_TENANT)
  return db.memberships.find((m) => m.tenantId === tenant?.id && m.userId === userId)?.role ?? null
}

/**
 * Wrong email and wrong password are one answer (03 §4.1): nothing tells
 * which one was wrong. Ten failures lock the email for 15 minutes (11 §3).
 */
export function signIn(email: string, password: string): SignInResult {
  const key = norm(email)
  const now = mockNow()
  const failures = db.signInFailures.find((f) => f.email === key)
  if (failures?.lockedUntil && failures.lockedUntil > now) {
    return { ok: false, error: 'locked', until: failures.lockedUntil }
  }
  const pending = db.pendingAccounts.find((p) => p.email === key)
  const user = userByEmail(key)
  if (demoPassword(password) && pending) return { ok: false, error: 'unverified', email: key }
  if (!user || !demoPassword(password)) {
    const row = failures ?? { email: key, count: 0, lockedUntil: null as string | null }
    if (!failures) db.signInFailures.push(row)
    row.count += 1
    if (row.count >= SIGN_IN_ATTEMPTS) {
      row.lockedUntil = new Date(Date.parse(now) + LOCK_MINUTES * 60_000).toISOString()
      row.count = 0
      return { ok: false, error: 'locked', until: row.lockedUntil }
    }
    return { ok: false, error: 'mismatch' }
  }
  if (failures) db.signInFailures.splice(db.signInFailures.indexOf(failures), 1)
  return { ok: true, userId: user.id, role: roleInDemo(user.id), needsTwoFactor: user.twoFactor }
}

/**
 * A token for a link that would be emailed. Issued whether or not the email
 * has an account, so the answer never tells (11 §4: forgot answers the same).
 */
export function issueToken(kind: TokenKind, email: string): string {
  const token = `${kind}-${String(db.authTokens.length + 1).padStart(4, '0')}`
  db.authTokens.push({ token, kind, email: norm(email), usedAt: null, issuedOn: mockToday() })
  return token
}

const live = (kind: TokenKind, token: string) =>
  db.authTokens.find((t) => t.token === token && t.kind === kind && t.usedAt === null)

/** Opening the page does not use the token: mail scanners open links (03 §4.1). */
export function peekToken(kind: TokenKind, token: string): { email: string } | null {
  const row = live(kind, token)
  return row ? { email: row.email } : null
}

/** The click, a POST, uses it; a second click finds nothing. */
export function consumeToken(
  kind: TokenKind,
  token: string,
): { email: string; userId: Uuid | null; role: ReturnType<typeof roleInDemo> } | null {
  const row = live(kind, token)
  if (!row) return null
  row.usedAt = mockNow()
  if (kind === 'verify') {
    // The email is confirmed: the account exists now, still without a company
    // (making the company is registration's real work in step 4, 03 §4.1).
    const at = db.pendingAccounts.findIndex((p) => p.email === row.email)
    const pending = db.pendingAccounts[at]
    if (pending) {
      db.pendingAccounts.splice(at, 1)
      db.users.push({
        id: `01922000-0000-7000-9000-${String(db.users.length + 1).padStart(12, '0')}`,
        email: pending.email,
        name: pending.name,
        isSuperAdmin: false,
        lastActiveTenantId: null,
        twoFactor: false,
      })
    }
  }
  const user = userByEmail(row.email)
  return { email: row.email, userId: user?.id ?? null, role: user ? roleInDemo(user.id) : null }
}

/**
 * /register in the mock: the account waits for its email to be confirmed, and
 * only then would the company be made (03 §4.1). Returns the confirmation
 * token, which the demo shows instead of emailing it.
 */
export function register(
  input: RegisterInput,
  withInvitation: boolean,
): { ok: true; token: string } | { ok: false; error: RegisterErrorCode } {
  if (!withInvitation && input.company === '') return { ok: false, error: 'companyRequired' }
  if (userByEmail(input.email) || db.pendingAccounts.some((p) => p.email === input.email)) {
    return { ok: false, error: 'emailTaken' }
  }
  db.pendingAccounts.push({ email: input.email, name: input.name })
  return { ok: true, token: issueToken('verify', input.email) }
}

/** The invitation behind /invite/[token]; the token is the invitation's id in the mock. */
export function invitation(token: string): InvitationDTO | null {
  const row = db.invitations.find(
    (i) => i.id === token && i.acceptedAt === null && i.expiresAt >= mockToday(),
  )
  if (!row) return null
  const tenant = db.tenants.find((t) => t.id === row.tenantId)
  const inviter = db.users.find((u) => u.id === row.invitedBy)
  return {
    email: row.email,
    inviterName: inviter?.name ?? '',
    companyName: tenant?.legalName ?? '',
    role: row.role,
  }
}

/** The user's own sessions, seeded once per user so the list reads the same every run. */
function sessionsOf(userId: Uuid) {
  let rows = db.userSessions.filter((s) => s.userId === userId)
  if (rows.length === 0) {
    db.userSessions.push(
      {
        id: `${userId}-1`,
        userId,
        device: 'Chrome on Windows',
        lastActive: mockNow(),
        current: true,
      },
      {
        id: `${userId}-2`,
        userId,
        device: 'Safari on iPhone',
        lastActive: `${addDays(mockToday(), -1)}T18:20:00.000Z`,
        current: false,
      },
    )
    rows = db.userSessions.filter((s) => s.userId === userId)
  }
  return rows
}

export function account(userId: Uuid): AccountDTO | null {
  const user = db.users.find((u) => u.id === userId)
  if (!user) return null
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    twoFactor: user.twoFactor,
    sessions: sessionsOf(userId).map(({ id, device, lastActive, current }) => ({
      id,
      device,
      lastActive,
      current,
    })),
  }
}

export function signOutSession(userId: Uuid, sessionId: string): void {
  const at = db.userSessions.findIndex(
    (s) => s.userId === userId && s.id === sessionId && !s.current,
  )
  if (at >= 0) db.userSessions.splice(at, 1)
}

/** "Sign out everywhere" keeps this device; a password change does the same (11 §3). */
export function signOutEverywhere(userId: Uuid): void {
  sessionsOf(userId)
  for (let i = db.userSessions.length - 1; i >= 0; i--) {
    const s = db.userSessions[i]
    if (s && s.userId === userId && !s.current) db.userSessions.splice(i, 1)
  }
}

export function renameUser(userId: Uuid, name: string): void {
  const user = db.users.find((u) => u.id === userId)
  if (user) user.name = name
}
