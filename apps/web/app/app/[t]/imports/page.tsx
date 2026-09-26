import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ImportsScreen } from '@/features/imports/ImportsScreen'

export const metadata: Metadata = { title: copy.nav.import }

export default async function ImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <ImportsScreen slug={t} search={search} />
}
