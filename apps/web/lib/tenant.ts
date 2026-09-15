'use client'

// The active company on the client: its slug from the route (spec/19 §2).
import { useParams } from 'next/navigation'

/** Client hook: the company slug from /app/[t]/... */
export function useTenant(): { slug: string } {
  const params = useParams<{ t: string }>()
  return { slug: params.t }
}
