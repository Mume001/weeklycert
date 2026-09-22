import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { SignScreen } from '@/features/reports/SignScreen'

export const metadata: Metadata = { title: copy.sign.title }

export default async function SignPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string; we: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id, we }, search] = await Promise.all([params, searchParams])
  return <SignScreen slug={t} projectId={id} weekEnding={we} search={search} />
}
