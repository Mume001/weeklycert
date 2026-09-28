import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AdminClassifications } from '@/features/admin/AdminScreens'

export const metadata: Metadata = { title: copy.admin.nav.classifications }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <AdminClassifications search={await searchParams} />
}
