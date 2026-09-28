import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { RegisterScreen } from '@/features/auth/Screens'

export const metadata: Metadata = { title: copy.auth.register.title }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; invite?: string }>
}) {
  return <RegisterScreen search={await searchParams} />
}
