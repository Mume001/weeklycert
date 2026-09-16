'use client'

// The error state of the grid (spec/19 §7). It is its own client component
// because the retry is a function, and a server component cannot hand a
// function to a client one.
import { ErrorState } from '@/components/patterns/ErrorState'

export function GridErrorState({ requestId }: { requestId: string }) {
  return <ErrorState requestId={requestId} onRetry={() => window.location.reload()} />
}
