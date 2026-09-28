import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AdminJobs } from '@/features/admin/AdminScreens'

export const metadata: Metadata = { title: copy.admin.nav.jobs }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <AdminJobs search={await searchParams} />
}
