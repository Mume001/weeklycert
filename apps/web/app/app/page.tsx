import { getRepositories } from '@wc/data'
import { redirect } from 'next/navigation'
import { mockSession } from '@/lib/session'

/**
 * /app (spec/03 §2): to the company, or to /firms when there is more than one
 * to choose from. The mock remembers no "last active company"; with one
 * membership there is nothing to choose, with several /firms lets the user
 * pick. Step 4 keeps the last one in the session.
 */
export default async function AppPage() {
  const { userId } = await mockSession()
  const repos = getRepositories()
  // The platform admin is no member of any company: /admin, and a company
  // only through impersonation (03 §4.10, 11 §4).
  if ((await repos.users.get(userId))?.isSuperAdmin) redirect('/admin')
  const tenants = await repos.tenants.listForUser(userId)
  const only = tenants.length === 1 ? tenants[0] : undefined
  redirect(only ? `/app/${only.slug}/dashboard` : '/firms')
}
