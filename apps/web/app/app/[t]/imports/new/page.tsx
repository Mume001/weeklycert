import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { NewImportScreen } from '@/features/imports/NewImportScreen'

export const metadata: Metadata = { title: copy.imports.upload.title }

export default async function NewImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{
    state?: string
    batch?: string
    step?: string
    kind?: string
    project?: string
    week?: string
  }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <NewImportScreen slug={t} search={search} />
}
