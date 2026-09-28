'use server'

// Server actions of /account and /account/security (spec/03 §4.2). The guard
// is requireSession (spec/11 §4): a signed-in user, no company.
import { getRepositories } from '@wc/data'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSession } from '@/lib/session'

export type ProfileResult = { ok: true; emailSentTo: string | null } | { ok: false }

/** The name changes at once; a new email only after its confirmation link (03 §4.2). */
export async function saveProfileAction(raw: unknown): Promise<ProfileResult> {
  const { user } = await requireSession()
  const parsed = z
    .object({
      name: z.string().trim().min(1),
      email: z.string().trim().toLowerCase().pipe(z.email()),
    })
    .safeParse(raw)
  if (!parsed.success) return { ok: false }
  await getRepositories().auth.renameUser(user.id, parsed.data.name)
  revalidatePath('/account')
  return { ok: true, emailSentTo: parsed.data.email === user.email ? null : parsed.data.email }
}

export type PasswordResult = { ok: true } | { ok: false; error: 'wrong' | 'short' }

/** Mock: the current password is "demo" (19 §4); a change signs out every other session (11 §3). */
export async function changePasswordAction(current: string, next: string): Promise<PasswordResult> {
  const { user } = await requireSession()
  if (current !== 'demo') return { ok: false, error: 'wrong' }
  if (next.length < 12) return { ok: false, error: 'short' }
  await getRepositories().auth.signOutEverywhere(user.id)
  revalidatePath('/account/security')
  return { ok: true }
}

export async function signOutSessionAction(sessionId: string): Promise<void> {
  const { user } = await requireSession()
  await getRepositories().auth.signOutSession(user.id, z.string().parse(sessionId))
  revalidatePath('/account/security')
}

export async function signOutEverywhereAction(): Promise<void> {
  const { user } = await requireSession()
  await getRepositories().auth.signOutEverywhere(user.id)
  revalidatePath('/account/security')
}
