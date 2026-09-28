// The two guards of spec/11 §4 that are not about a company or a session. In
// the mock phase neither route has anything behind it (19 §2), so each guard
// answers what the route answers there; step 4 and step 7 put the real checks
// in, and the routes keep calling them first.
import { GuardError } from './session'

/**
 * /api/metrics: the internal network only (10 §5), never public. The mock has
 * no metrics, so it refuses everyone with the 404 of a route that is not there.
 * TODO(step 8): allow the internal network, refuse the rest.
 */
export function internalOnly(_request: Request): void {
  throw new GuardError(404)
}

/**
 * /api/webhooks/stripe: the signature over the raw body, with the replay
 * window; never a tenant id from the body (11 §4). No Stripe SDK in the mock
 * phase (19 §1), so nothing is verified and nothing is accepted.
 * TODO(step 7): stripe.webhooks.constructEvent on the raw body.
 */
export async function verifyStripeSignature(_request: Request): Promise<never> {
  throw new StripeNotYet()
}

/** 410 Gone: the webhook exists in the plan, not in the mock (19 §2). */
export class StripeNotYet extends Error {}
