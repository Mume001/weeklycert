import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { MagicScreen } from '@/features/auth/Screens'

export const metadata: Metadata = { title: copy.auth.signInTitle }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ token }, search] = await Promise.all([params, searchParams])
  return <MagicScreen token={token} search={search} />
}
