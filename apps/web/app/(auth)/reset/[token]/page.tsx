import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ResetScreen } from '@/features/auth/Screens'

export const metadata: Metadata = { title: copy.auth.reset.title }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ token }, search] = await Promise.all([params, searchParams])
  return <ResetScreen token={token} search={search} />
}
