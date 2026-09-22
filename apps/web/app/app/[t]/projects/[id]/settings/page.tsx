import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { ProjectFormScreen } from '@/features/projects/ProjectFormScreen'

export const metadata: Metadata = { title: copy.projects.form.settingsTitle }

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id }, search] = await Promise.all([params, searchParams])
  return <ProjectFormScreen slug={t} projectId={id} search={search} />
}
