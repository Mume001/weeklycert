import { copy } from '@wc/copy'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { type ScreenState, screenState } from '@/lib/screen-state'

/**
 * The card every auth screen sits on (spec/14 §9: 420 wide, centred, radius
 * 10, padding 32, shadow md). Loading and error come from ?state= like every
 * other screen (spec/19 §7); the rest each screen decides.
 */
export function AuthCard({
  title,
  search,
  children,
}: {
  title: string
  search?: { state?: string }
  children: ReactNode
}) {
  const forced: ScreenState | undefined = screenState(search?.state)
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[10px] border border-border-decorative bg-white p-8 shadow-md">
        <p className="mb-6 text-sm font-semibold text-teal-700">
          <Link href="/login" className="rounded-sm focus-visible:focus-ring">
            {copy.brand.name}
          </Link>
        </p>
        <h1 className="mb-4 text-xl font-semibold text-text-primary">{title}</h1>
        {forced === 'loading' ? (
          <div aria-busy="true" className="grid gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-24" />
          </div>
        ) : forced === 'error' ? (
          <RetryErrorState />
        ) : (
          children
        )}
      </div>
    </main>
  )
}

/** Where an email would go: in the demo the link is shown instead (19 §4). */
export function DemoLink({ href }: { href: string }) {
  return (
    <p className="mt-3 rounded-md border border-border-decorative bg-n-50 px-3 py-2 text-xs text-text-secondary">
      {copy.auth.demoLink}{' '}
      <Link href={href} className="font-semibold text-teal-700 underline underline-offset-2">
        {copy.auth.openLink}
      </Link>
    </p>
  )
}
