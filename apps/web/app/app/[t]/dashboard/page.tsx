import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'

export const metadata: Metadata = { title: copy.nav.dashboard }

export default async function DashboardPage({ params }: { params: Promise<{ t: string }> }) {
  const { t } = await params
  return <DashboardScreen slug={t} />
}
