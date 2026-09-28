import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { AuthCard } from '@/features/auth/AuthCard'
import { ForgotForm } from '@/features/auth/TokenForms'

export const metadata: Metadata = { title: copy.auth.forgot.title }

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  return (
    <AuthCard title={copy.auth.forgot.title} search={await searchParams}>
      <ForgotForm />
    </AuthCard>
  )
}
