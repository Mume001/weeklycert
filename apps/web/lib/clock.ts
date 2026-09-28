// The one clock support access runs on (spec/11 §2: 30 minutes). In the mock
// it is the fixed "now" (19 §4), moved by CLOCK_COOKIE when a test needs the
// 30 minutes to pass. Step 4: the server's clock, and a job closes the access.
import { getRepositories } from '@wc/data'
import { cookies } from 'next/headers'
import { CLOCK_COOKIE } from './mock-role'

export async function supportNow(): Promise<string> {
  const now = Date.parse(getRepositories().now())
  const minutes = Number((await cookies()).get(CLOCK_COOKIE)?.value ?? 0)
  const shift = Number.isFinite(minutes) ? minutes : 0
  return new Date(now + shift * 60_000).toISOString()
}
