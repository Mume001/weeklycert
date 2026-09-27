import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { FirmsScreen } from '@/features/firms/FirmsScreen'

export const metadata: Metadata = { title: copy.shell.tenantSwitcher.title }

export default async function FirmsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return <FirmsScreen search={await searchParams} />
}
