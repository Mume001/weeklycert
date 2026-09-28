'use server'

// Server actions of /admin (spec/03 §4.10). The guard is requireSuperAdmin
// (spec/11 §4); the data layer checks the admin once more on every write.
import { getRepositories } from '@wc/data'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { supportNow } from '@/lib/clock'
import { requireSuperAdmin } from '@/lib/session'

const Id = z.string().min(1)

export type SupportResult = { ok: false; error: 'reasonRequired' }

/** Opens the company read only for 30 minutes, with the reason in its audit log (11 §2). */
export async function startSupportAction(tenantId: string, reason: string): Promise<SupportResult> {
  const { user } = await requireSuperAdmin()
  if (reason.trim() === '') return { ok: false, error: 'reasonRequired' }
  const repos = getRepositories()
  const now = await supportNow()
  const tenant = await repos.admin.tenant(Id.parse(tenantId), user.id, now)
  if (!tenant) redirect('/admin/tenants')
  await repos.admin.startSupportAccess(tenant.id, user.id, reason, now)
  redirect(`/app/${tenant.slug}/dashboard`)
}

export async function endSupportAction(tenantId: string): Promise<void> {
  const { user } = await requireSuperAdmin()
  await getRepositories().admin.endSupportAccess(Id.parse(tenantId), user.id, await supportNow())
  redirect(`/admin/tenants/${tenantId}`)
}

export async function retryJobAction(jobId: string): Promise<void> {
  const { user } = await requireSuperAdmin()
  await getRepositories().admin.retryJob(Id.parse(jobId), user.id)
  revalidatePath('/admin/jobs')
}

export async function discardJobAction(jobId: string): Promise<void> {
  const { user } = await requireSuperAdmin()
  await getRepositories().admin.discardJob(Id.parse(jobId), user.id)
  revalidatePath('/admin/jobs')
}

export async function approveScheduleAction(scheduleId: string): Promise<void> {
  const { user } = await requireSuperAdmin()
  await getRepositories().admin.approveWageSchedule(Id.parse(scheduleId), user.id)
  revalidatePath('/admin/wage-schedules')
}
