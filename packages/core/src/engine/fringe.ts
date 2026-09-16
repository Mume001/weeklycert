// Fringe benefits, called supplements in NY (spec/01 §2.3).
//
// Three things decide whether a week is compliant: what the plan is worth per
// hour (annualisation), what is paid in cash instead, and whether the two
// together reach the rate in the wage determination. NY gives no credit across
// the line: a surplus in wages never covers a shortfall in supplements.
import { clampAtZero, type Dec, dec, ZERO } from '../money.ts'
import type { AllocationInput, FringePlanInput } from './types.ts'

export interface PlanCredit {
  planId: string
  name: string
  kind: FringePlanInput['kind']
  funding: FringePlanInput['funding']
  /** Credit per hour, zero when the plan may not be counted. */
  hourly: Dec
  /** annual_cost without annual_hours_basis: FRINGE_NOT_ANNUALIZED (spec/07 §3.2). */
  missingAnnualBasis: boolean
  /** FICA, workers comp: never a fringe benefit. */
  legallyRequired: boolean
}

/**
 * The hourly credit of one plan for one worker.
 *
 * The order is: what the worker's allocation overrides, then the plan's own
 * hourly credit, then annualisation of the yearly cost over all hours worked in
 * a year, public and private alike (29 CFR 5.25(b)). NY falls back to 2080
 * hours when the firm has no documented hours.
 */
export function planCredit(
  plan: FringePlanInput,
  allocation: AllocationInput,
  tenantAnnualHoursBasis: string,
): PlanCredit {
  const base: Omit<PlanCredit, 'hourly'> = {
    planId: plan.id,
    name: plan.name,
    kind: plan.kind,
    funding: plan.funding,
    missingAnnualBasis: plan.annualCost !== null && plan.annualHoursBasis === null,
    legallyRequired: plan.isLegallyRequired,
  }
  if (plan.isLegallyRequired) return { ...base, hourly: ZERO }
  if (allocation.hourlyCreditOverride !== null) {
    return { ...base, hourly: dec(allocation.hourlyCreditOverride) }
  }
  if (plan.hourlyCredit !== null) return { ...base, hourly: dec(plan.hourlyCredit) }
  if (plan.annualCost !== null) {
    const basis = dec(plan.annualHoursBasis ?? tenantAnnualHoursBasis)
    if (basis.lte(ZERO)) return { ...base, hourly: ZERO }
    const annualised = dec(plan.annualCost).div(basis)
    // A plan that is exempt from annualisation (defined contribution, immediate
    // participation and vesting) is credited at its full yearly cost per hour
    // only through `hourlyCredit`; without one there is nothing else to use.
    return { ...base, hourly: annualised }
  }
  return { ...base, hourly: ZERO }
}

export interface FringePosition {
  /** Credit from plan contributions, per hour. */
  creditHourly: Dec
  /** Cash paid instead of a benefit, per hour (29 CFR 5.31). */
  cashHourly: Dec
  requiredHourly: Dec
  shortfallHourly: Dec
  status: 'plan' | 'cash' | 'mixed' | 'missing'
}

/**
 * Is the supplement covered for one row of the grid?
 *
 *   paid    = plan credit + cash in lieu
 *   needed  = the fringe rate of the wage determination
 *   missing = max(0, needed - paid)
 */
export function fringePosition(
  credits: readonly PlanCredit[],
  cashInLieuHourly: Dec,
  requiredHourly: Dec,
): FringePosition {
  let creditHourly = ZERO
  let cashHourly = cashInLieuHourly
  for (const credit of credits) {
    if (credit.funding === 'cash_in_lieu') cashHourly = cashHourly.plus(credit.hourly)
    else creditHourly = creditHourly.plus(credit.hourly)
  }
  const paid = creditHourly.plus(cashHourly)
  const hasPlan = creditHourly.gt(ZERO)
  const hasCash = cashHourly.gt(ZERO)
  const status = hasPlan && hasCash ? 'mixed' : hasPlan ? 'plan' : hasCash ? 'cash' : 'missing'
  return {
    creditHourly,
    cashHourly,
    requiredHourly,
    shortfallHourly: clampAtZero(requiredHourly.minus(paid)),
    status,
  }
}

/** Allocations in force for a date, so a worker who joined mid-project is right. */
export function allocationsOn(
  allocations: readonly AllocationInput[],
  date: string,
): AllocationInput[] {
  return allocations.filter(
    (allocation) =>
      allocation.effectiveFrom <= date &&
      (allocation.effectiveTo === null || allocation.effectiveTo >= date),
  )
}
