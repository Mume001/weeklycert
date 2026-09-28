import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AdminOverview } from '@/features/admin/AdminScreens'

export const metadata: Metadata = { title: copy.admin.nav.overview }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <AdminOverview search={await searchParams} />
}
