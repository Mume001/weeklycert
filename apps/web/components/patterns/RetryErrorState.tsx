'use client'

// The error state of the project screens (spec/19 §7). A client component of
// its own because the retry is a function, which a server component cannot pass.
import { ErrorState } from '@/components/patterns/ErrorState'
import { MOCK_REQUEST_ID } from '@/lib/screen-state'

export function RetryErrorState() {
  return <ErrorState requestId={MOCK_REQUEST_ID} onRetry={() => window.location.reload()} />
}
