import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AdminWageSchedules } from '@/features/admin/AdminScreens'

export const metadata: Metadata = { title: copy.admin.nav.wageSchedules }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <AdminWageSchedules search={await searchParams} />
}
