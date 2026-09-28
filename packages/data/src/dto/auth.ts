// Sign-in and the account (spec/03 §4.1 and §4.2, spec/11 §3). In the mock
// phase the forms only navigate (spec/20 M); Better Auth replaces this in
// step 4. Errors are codes; the words are in packages/copy (15 §3).
import { z } from 'zod'
import type { MembershipRole, Uuid } from './common.ts'

/** 11 §3: after 10 failed sign-ins, 15 minutes locked. */
export const SIGN_IN_ATTEMPTS = 10
export const LOCK_MINUTES = 15
/** 11 §3: at least 12 characters. */
export const PASSWORD_MIN = 12

export type SignInResult =
  | { ok: true; userId: Uuid; role: MembershipRole | null; needsTwoFactor: boolean }
  | { ok: false; error: 'mismatch' }
  | { ok: false; error: 'locked'; until: string }
  | { ok: false; error: 'unverified'; email: string }

export const TOKEN_KINDS = ['magic', 'verify', 'reset'] as const
export type TokenKind = (typeof TOKEN_KINDS)[number]

export const RegisterInputSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired'),
  email: z.string().trim().toLowerCase().pipe(z.email('emailFormat')),
  password: z.string().min(PASSWORD_MIN, 'passwordShort'),
  /** Empty when the account comes with an invitation (03 §4.1). */
  company: z.string().trim(),
  terms: z.literal(true, 'termsRequired'),
})
export type RegisterInput = z.infer<typeof RegisterInputSchema>
export type RegisterErrorCode =
  | 'nameRequired'
  | 'emailFormat'
  | 'passwordShort'
  | 'companyRequired'
  | 'termsRequired'
  | 'emailTaken'

export interface InvitationDTO {
  email: string
  inviterName: string
  companyName: string
  role: MembershipRole
}

export interface SessionDTO {
  id: string
  device: string
  lastActive: string
  current: boolean
}

export interface AccountDTO {
  userId: Uuid
  name: string
  email: string
  twoFactor: boolean
  sessions: SessionDTO[]
}
