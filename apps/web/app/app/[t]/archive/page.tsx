import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ArchiveScreen } from '@/features/archive/ArchiveScreen'

export const metadata: Metadata = { title: copy.nav.archive }

export default async function ArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{
    state?: string
    query?: string
    projectId?: string
    year?: string
    status?: string
    versions?: string
    worker?: string
  }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <ArchiveScreen slug={t} search={search} />
}
