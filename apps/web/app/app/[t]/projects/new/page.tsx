import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ProjectFormScreen } from '@/features/projects/ProjectFormScreen'

export const metadata: Metadata = { title: copy.projects.form.newTitle }

export default async function NewProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t }, search] = await Promise.all([params, searchParams])
  return <ProjectFormScreen slug={t} projectId={null} search={search} />
}
