import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ClassificationsScreen } from '@/features/projects/ClassificationsScreen'

export const metadata: Metadata = { title: copy.projects.classifications.title }

export default async function ProjectClassificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id }, search] = await Promise.all([params, searchParams])
  return <ClassificationsScreen slug={t} projectId={id} search={search} />
}
