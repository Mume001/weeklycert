// Feature flags (spec/04 feature_flags, 09 §4: flag(key, tenantId)). Server
// only. In the mock a test may play a flag on (FLAGS_COOKIE).
import { type FlagKey, getRepositories } from '@wc/data'
import { cookies } from 'next/headers'
import { FLAGS_COOKIE } from './mock-role'

export async function flag(key: FlagKey, tenantId: string): Promise<boolean> {
  const played = (await cookies()).get(FLAGS_COOKIE)?.value?.split(',') ?? []
  if (played.includes(key)) return true
  return getRepositories().flags.isOn(tenantId, key)
}
