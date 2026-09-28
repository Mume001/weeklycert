import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AdminTenants } from '@/features/admin/AdminScreens'

export const metadata: Metadata = { title: copy.admin.nav.tenants }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string }>
}) {
  return <AdminTenants search={await searchParams} />
}
