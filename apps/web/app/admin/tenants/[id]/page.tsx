import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AdminTenant } from '@/features/admin/AdminScreens'

export const metadata: Metadata = { title: copy.admin.nav.tenants }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ id }, search] = await Promise.all([params, searchParams])
  return <AdminTenant id={id} search={search} />
}
