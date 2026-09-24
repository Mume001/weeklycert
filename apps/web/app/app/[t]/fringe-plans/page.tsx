import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { FringePlansScreen } from '@/features/fringe/FringePlansScreen'

export const metadata: Metadata = { title: copy.nav.fringePlans }

export default async function FringePlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string; plan?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <FringePlansScreen slug={t} search={search} />
}
