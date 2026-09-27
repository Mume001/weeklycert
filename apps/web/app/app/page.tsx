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
  const tenants = await getRepositories().tenants.listForUser(userId)
  const only = tenants.length === 1 ? tenants[0] : undefined
  redirect(only ? `/app/${only.slug}/dashboard` : '/firms')
}
