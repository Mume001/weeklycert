import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { TimelineScreen } from '@/features/projects/TimelineScreen'

export const metadata: Metadata = { title: copy.nav.projects }

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id }, search] = await Promise.all([params, searchParams])
  return <TimelineScreen slug={t} projectId={id} search={search} />
}
