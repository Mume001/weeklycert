import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ProjectsScreen } from '@/features/projects/ProjectsScreen'

export const metadata: Metadata = { title: copy.nav.projects }

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string; open?: string; status?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <ProjectsScreen slug={t} search={search} />
}
