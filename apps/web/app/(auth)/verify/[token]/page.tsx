import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { VerifyScreen } from '@/features/auth/Screens'

export const metadata: Metadata = { title: copy.auth.verify.title }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ token }, search] = await Promise.all([params, searchParams])
  return <VerifyScreen token={token} search={search} />
}
