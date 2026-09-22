import { copy } from '@wc/copy'
import type { Metadata } from 'next'
import { FindingsPanel } from '@/features/findings/FindingsPanel'
import { ReviewScreen } from '@/features/reports/ReviewScreen'

export const metadata: Metadata = { title: copy.review.title }

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ t: string; id: string; we: string }>
  searchParams: Promise<{ state?: string }>
}) {
  const [{ t, id, we }, search] = await Promise.all([params, searchParams])
  return (
    <ReviewScreen
      slug={t}
      projectId={id}
      weekEnding={we}
      search={search}
      findingsPanel={<FindingsPanel />}
    />
  )
}
