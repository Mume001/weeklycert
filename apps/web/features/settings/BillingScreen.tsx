import { copy, fill } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { CancelFlow, CancellingControls, PausedControls, PauseForm } from './BillingForms'
import { settingsPage } from './SettingsFrame'

const t = copy.settings.billing

/**
 * /settings/billing (spec/03 §4.9, spec/08): the plan, the trial, the next
 * charge, the setup that was paid, and pause and cancel. The owner alone
 * (02 §3). The card and the invoices are Stripe's portal, which comes in
 * step 7; the mock says so instead of pretending.
 */
export async function BillingScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string }
}) {
  const page = await settingsPage(slug, 'billing', search, 'owner')
  if ('done' in page) return page.done
  const { shell, forced, frame } = page.ctx
  const dto = await getRepositories().settings.billing(shell.tenant.id)
  // A deleted company answers 410 before it gets here (08 §2.4).
  const status =
    forced === 'locked' ? 'paused' : dto.status === 'deleted' ? 'cancelled' : dto.status
  const tier = forced === 'empty' ? null : dto.setupTier
  const exportHref = `/api/files/export%3Aall?t=${encodeURIComponent(slug)}`

  return frame(
    <>
      {status === 'paused' && <PausedControls slug={slug} resumesOn={dto.pauseResumesOn} />}
      {status !== 'paused' && dto.cancelAtPeriodEnd && dto.periodEndsOn && (
        <CancellingControls slug={slug} endsOn={dto.periodEndsOn} />
      )}
      <section
        aria-labelledby="plan-title"
        className="grid max-w-[880px] gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="plan-title" className="text-md font-semibold text-text-primary">
            {t.plan}
          </h2>
          <span
            data-testid="billing-status"
            className="inline-flex h-[22px] items-center rounded-full border border-border-decorative bg-n-100 px-2 text-2xs font-semibold text-n-700"
          >
            {t.status[status]}
          </span>
        </div>
        <p className="text-2xl font-semibold text-text-primary">{t.price}</p>
        <p className="text-sm text-text-secondary">
          {t.planDetail}{' '}
          {status === 'trial' && dto.trialEndsOn
            ? fill(t.trialEnds, { date: formatDate(dto.trialEndsOn) })
            : dto.periodEndsOn && !dto.cancelAtPeriodEnd && status !== 'paused'
              ? fill(t.nextCharge, { date: formatDate(dto.periodEndsOn) })
              : ''}
        </p>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-text-secondary">{t.setup}</dt>
          <dd>
            {tier && tier !== 'waived' && dto.setupPaidOn
              ? fill(t.setupPaid, {
                  Tier: copy.setupTiers[tier],
                  price: copy.onboarding.billing.tiers[tier].price,
                  date: formatDate(dto.setupPaidOn),
                })
              : t.setupNone}
          </dd>
        </dl>
        <div className="grid gap-1">
          <div>
            <Button variant="secondary" disabled>
              {t.manage}
            </Button>
          </div>
          <p className="text-xs text-text-secondary">{t.manageNote}</p>
        </div>
        {status !== 'paused' && status !== 'cancelled' && !dto.cancelAtPeriodEnd && (
          <div className="flex flex-wrap items-start gap-3 border-t border-border-decorative pt-3">
            <PauseForm slug={slug} />
            <CancelFlow slug={slug} companyName={shell.tenant.legalName} exportHref={exportHref} />
          </div>
        )}
      </section>
      <section
        aria-labelledby="records-title"
        className="grid max-w-[880px] gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
      >
        <h2 id="records-title" className="text-md font-semibold text-text-primary">
          {t.records.title}
        </h2>
        <p className="text-sm text-text-secondary">{t.records.body}</p>
        <div>
          <Button asChild variant="secondary">
            <a href={exportHref}>{t.cancel.exportAction}</a>
          </Button>
        </div>
      </section>
    </>,
  )
}
