import { copy, fill } from '@wc/copy'
import { getRepositories, type MembershipRole, ONBOARDING_STEPS } from '@wc/data'
import { cn } from 'cn'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageBar } from '@/components/app-shell/PageBar'
import { ForbiddenState } from '@/components/patterns/ForbiddenState'
import { FormField, fieldIds, selectClass } from '@/components/patterns/FormField'
import { Notice } from '@/components/patterns/Notice'
import { RetryErrorState } from '@/components/patterns/RetryErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { screenState } from '@/lib/screen-state'
import { isReadOnlyCompany, loadShell, PROJECT_WRITERS } from '@/lib/session'
import { chooseSetupTierAction, completeStepAction, openFirstWeekAction } from './actions'
import { CompanyForm } from './CompanyForm'
import { currentStep, DONE_STEP, lockedFor, stepAllowed, stepHref } from './steps'

const o = copy.onboarding

/** What the page needs to put a feature's form into steps 2 to 5 (spec/19 §2, the exception). */
export interface StepContext {
  slug: string
  tenantId: string
  step: number
  /** The wizard's project, carried from step 2 on; null until there is one. */
  projectId: string | null
  role: MembershipRole
  readOnly: boolean
  search: Record<string, string | undefined>
  /** The URL of this step, for a create that should land back in the wizard. */
  here: (extra?: Record<string, string>) => string
}

function Progress({
  slug,
  step,
  done,
  projectId,
}: {
  slug: string
  step: number
  done: number
  projectId: string | null
}) {
  return (
    <nav aria-label={o.progressLabel}>
      <ol className="flex flex-wrap gap-2">
        {o.steps.map((label, i) => {
          const n = i + 1
          const isDone = n <= done
          return (
            <li key={label}>
              <Link
                href={stepHref(slug, n, projectId)}
                aria-current={n === step ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-semibold focus-visible:focus-ring',
                  n === step
                    ? 'border-n-900 bg-n-900 text-white'
                    : 'border-border-interactive bg-white text-n-800 hover:bg-n-50',
                )}
              >
                <span className="tabular-nums">{n}</span>
                {label}
                {isDone && (
                  <>
                    <Check className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{o.done}</span>
                  </>
                )}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function LoadingStep() {
  return (
    <div
      aria-busy="true"
      className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 sm:grid-cols-2"
    >
      {Array.from({ length: 6 }, (_, i) => `f${i}`).map((key) => (
        <div key={key} className="grid gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9" />
        </div>
      ))}
    </div>
  )
}

/** Step 6: pick the week, and the grid opens on it (03 §4.3). */
async function WeekStep({
  slug,
  tenantId,
  projectId,
  readOnly,
}: {
  slug: string
  tenantId: string
  projectId: string | null
  readOnly: boolean
}) {
  const timeline = projectId ? await getRepositories().projects.timeline(tenantId, projectId) : null
  if (!projectId || !timeline) return <p className="text-sm text-text-secondary">{o.noProject}</p>
  const weeks = timeline.weeks.filter((w) => !w.locked)
  if (weeks.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        {fill(copy.projects.timeline.empty.body, {
          date: formatDate(timeline.project.firstWeekEnding),
        })}
      </p>
    )
  }
  return (
    <form
      action={openFirstWeekAction.bind(null, slug, projectId)}
      className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
    >
      <p className="text-sm text-text-secondary">{o.week.intro}</p>
      <FormField id="first-week" label={o.week.label}>
        <select
          {...fieldIds('first-week')}
          name="weekEnding"
          className={cn(selectClass, 'max-w-xs')}
          disabled={readOnly}
        >
          {weeks.map((w) => (
            <option key={w.weekEnding} value={w.weekEnding}>
              {formatDate(w.weekEnding)}
            </option>
          ))}
        </select>
      </FormField>
      {!readOnly && (
        <div>
          <Button type="submit">{o.week.open}</Button>
        </div>
      )}
    </form>
  )
}

/** Step 7 in the mock phase: pick the setup tier; nothing is charged (spec/20 H). */
function BillingStep({ slug, readOnly }: { slug: string; readOnly: boolean }) {
  const tiers = ['basic', 'standard', 'full', 'waived'] as const
  return (
    <form
      action={chooseSetupTierAction.bind(null, slug)}
      className="grid max-w-[880px] gap-4 rounded-lg border border-border-decorative bg-white p-5 shadow-sm"
    >
      <p className="text-sm text-text-secondary">{o.billing.intro}</p>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-n-800">{o.billing.group}</legend>
        {tiers.map((tier, i) => {
          const t = o.billing.tiers[tier]
          return (
            <label
              key={tier}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border-interactive p-3 has-[:checked]:border-n-900 has-[:focus-visible]:focus-ring"
            >
              <input
                type="radio"
                name="tier"
                value={tier}
                defaultChecked={i === 1}
                disabled={readOnly}
                className="mt-1 size-4 accent-brand"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-semibold text-text-primary">
                  {t.name} <span className="tabular-nums text-text-secondary">{t.price}</span>
                </span>
                <span className="text-xs text-text-secondary">{t.detail}</span>
              </span>
            </label>
          )
        })}
      </fieldset>
      <Notice tone="info" title={o.billing.mock} />
      {!readOnly && (
        <div>
          <Button type="submit">{o.billing.pay}</Button>
        </div>
      )}
    </form>
  )
}

/**
 * /app/[t]/onboarding, the seven steps of spec/03 §4.3. Each step is saved as
 * it is done and the wizard resumes where it was left. Steps 2 to 5 are the
 * forms of sessions F and G; the page puts them in through `body` (spec/19 §2,
 * the one exception to features not importing each other).
 */
export async function OnboardingScreen({
  slug,
  search,
  body,
}: {
  slug: string
  search: Record<string, string | undefined>
  body: (ctx: StepContext) => ReactNode
}) {
  const shell = await loadShell(slug)
  if (!shell) notFound()
  const forced = screenState(search.state)
  const repos = getRepositories()
  const progress = await repos.tenants.onboarding(shell.tenant.id)
  const step = forced === 'empty' ? 1 : currentStep(search.step, progress.step)
  const done = forced === 'empty' ? 0 : progress.step

  // The wizard's project: ?project= when it is this company's, else the first one.
  const asked = search.project
  const own = asked ? await repos.projects.form(shell.tenant.id, asked) : null
  const projectId = own?.projectId ?? (await repos.projects.list(shell.tenant.id))[0]?.id ?? null

  const paused = forced === 'locked' || isReadOnlyCompany(shell.tenant)
  const lock = lockedFor(step, shell.role)
  const readOnly = paused || lock !== null

  const bar = (
    <PageBar
      title={copy.nav.setup}
      meta={step <= ONBOARDING_STEPS ? fill(o.meta, { n: step }) : undefined}
      breadcrumb={[{ label: shell.tenant.legalName }]}
    />
  )
  const frame = (content: ReactNode) => (
    <>
      {bar}
      <div className="mx-auto grid w-full max-w-[1440px] gap-5 p-6">{content}</div>
    </>
  )

  // The viewer has no Setup (02 §5).
  if (forced === 'forbidden' || !PROJECT_WRITERS.includes(shell.role)) {
    return frame(
      <ForbiddenState
        role={forced === 'forbidden' ? 'viewer' : shell.role}
        needed="payroll"
        owner={shell.tenant.owner}
        dashboardHref={`/app/${slug}/dashboard`}
      />,
    )
  }
  if (forced === 'error') return frame(<RetryErrorState />)

  const progressBar = <Progress slug={slug} step={step} done={done} projectId={projectId} />
  if (forced === 'loading')
    return frame(
      <>
        {progressBar}
        <LoadingStep />
      </>,
    )

  if (step === DONE_STEP) {
    return frame(
      <>
        {progressBar}
        <div className="grid max-w-[880px] justify-items-start gap-3 rounded-lg border border-border-decorative bg-white p-5 shadow-sm">
          <p className="text-md font-semibold text-text-primary">{o.billing.complete}</p>
          <Button asChild>
            <Link href={`/app/${slug}/dashboard`}>{o.toDashboard}</Link>
          </Button>
        </div>
      </>,
    )
  }

  const next = stepHref(slug, step + 1, projectId)
  const ctx: StepContext = {
    slug,
    tenantId: shell.tenant.id,
    step,
    projectId,
    role: shell.role,
    readOnly,
    search,
    here: (extra = {}) => {
      const query = new URLSearchParams({ step: String(step), ...extra })
      if (projectId && !('project' in extra)) query.set('project', projectId)
      // "{id}" is a placeholder the form fills in; it must survive the encoding.
      return `/app/${slug}/onboarding?${query}`.replaceAll('%7Bid%7D', '{id}')
    },
  }

  let content: ReactNode
  if (step === 1) {
    const company = await repos.tenants.company(shell.tenant.id)
    content = (
      <CompanyForm
        slug={slug}
        form={
          forced === 'empty'
            ? { ...company, values: { ...company.values, legalName: '' }, feinLast4: null }
            : company
        }
        readOnly={readOnly}
        nextHref={next}
      />
    )
  } else if (step === 6) {
    content = (
      <WeekStep slug={slug} tenantId={shell.tenant.id} projectId={projectId} readOnly={readOnly} />
    )
  } else if (step === 7) {
    content = <BillingStep slug={slug} readOnly={readOnly} />
  } else {
    content = body(ctx)
  }

  const missing = progress.companyMissing.map(
    (field) => o.company.fields[field as keyof typeof o.company.fields]?.label ?? field,
  )
  const lockNotice = lock && (
    <Notice
      tone="info"
      title={fill(lock === 'company' ? o.locked.company : o.locked.billing, {
        'Owner name': shell.tenant.owner.name,
      })}
    >
      {lock === 'company' &&
        missing.length > 0 &&
        fill(o.locked.missing, { fields: missing.join(', ') })}
    </Notice>
  )

  const canSkip = !paused && lock === null && stepAllowed(step, 'skip', progress.inTrial)
  // Step 1 continues through its own save; step 6 through "Open the grid"; step 7 through the tier.
  const plainContinue = !paused && ((step >= 2 && step <= 5) || lock !== null)

  return frame(
    <>
      {progressBar}
      {paused && <Notice tone="info" title={copy.billing.paused} />}
      {lockNotice}
      {content}
      <div className="flex max-w-[880px] flex-wrap items-center gap-2">
        {step > 1 && (
          <Button asChild variant="secondary">
            <Link href={stepHref(slug, step - 1, projectId)}>{o.back}</Link>
          </Button>
        )}
        <span className="flex-1" />
        {canSkip && (
          <form action={completeStepAction.bind(null, slug, step, true, projectId)}>
            <Button type="submit" variant="secondary">
              {o.skip}
            </Button>
          </form>
        )}
        {plainContinue &&
          (lock !== null ? (
            <Button asChild>
              <Link href={next}>{o.continue}</Link>
            </Button>
          ) : (
            <form action={completeStepAction.bind(null, slug, step, false, projectId)}>
              {/* Steps 2 and 3 are the project; without one there is nothing to continue with. */}
              <Button type="submit" disabled={(step === 2 || step === 3) && projectId === null}>
                {o.continue}
              </Button>
            </form>
          ))}
      </div>
    </>,
  )
}
