// POST /api/webhooks/stripe (spec/03 §2, 08 §2.2). Guard: verifyStripeSignature
// (spec/11 §4). 410 in the mock phase (spec/19 §2): billing is a mock without
// Stripe until step 7.
// TODO(step 7): verify, write billing_events, queue billing.process_event, 200.
import { StripeNotYet, verifyStripeSignature } from '@/lib/guards'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  try {
    return await verifyStripeSignature(request)
  } catch (error) {
    if (error instanceof StripeNotYet) return Response.json({ error: 'gone' }, { status: 410 })
    return Response.json({ error: 'refused' }, { status: 400 })
  }
}
