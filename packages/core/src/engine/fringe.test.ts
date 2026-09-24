// Fringe credit and apprentice arithmetic (spec/01 §2.3 and §2.4).
import { describe, expect, it } from 'vitest'
import { dec, money, rate } from '../money.ts'
import {
  allowedApprentices,
  apprenticeRate,
  parseRatio,
  ratioExceeded,
  recordCovers,
} from './apprentice.ts'
import { allocationsOn, fringePosition, monthlyPremiumCredit, planCredit } from './fringe.ts'
import type { AllocationInput, ApprenticeRecordInput, FringePlanInput } from './types.ts'

function plan(partial: Partial<FringePlanInput> = {}): FringePlanInput {
  return {
    id: 'plan-1',
    name: 'Local 3 Health Fund',
    kind: 'health_welfare',
    funding: 'plan_contribution',
    annualCost: null,
    annualHoursBasis: null,
    hourlyCredit: null,
    annualize: true,
    isLegallyRequired: false,
    ...partial,
  }
}

function allocation(partial: Partial<AllocationInput> = {}): AllocationInput {
  return {
    planId: 'plan-1',
    hourlyCreditOverride: null,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    ...partial,
  }
}

describe('the hourly credit of a plan', () => {
  it('annualises a yearly cost over all hours worked in a year (29 CFR 5.25(b))', () => {
    const credit = planCredit(plan({ annualCost: '7200.00' }), allocation(), '2080')
    expect(rate(credit.hourly)).toBe('3.4615')
    expect(money(credit.hourly)).toBe('3.46')
    expect(credit.missingAnnualBasis).toBe(true)
  })

  it('uses the hours of the plan before the default of the firm', () => {
    const credit = planCredit(
      plan({ annualCost: '7200.00', annualHoursBasis: '1820' }),
      allocation(),
      '2080',
    )
    expect(rate(credit.hourly)).toBe('3.9560')
    expect(credit.missingAnnualBasis).toBe(false)
  })

  it('takes the credit of the plan when there is one', () => {
    expect(rate(planCredit(plan({ hourlyCredit: '6.00' }), allocation(), '2080').hourly)).toBe(
      '6.0000',
    )
  })

  it('lets the allocation of the worker override it', () => {
    const credit = planCredit(
      plan({ hourlyCredit: '6.00' }),
      allocation({ hourlyCreditOverride: '7.25' }),
      '2080',
    )
    expect(rate(credit.hourly)).toBe('7.2500')
  })

  it('credits nothing for a contribution required by law (spec/01 §2.3)', () => {
    const credit = planCredit(
      plan({ hourlyCredit: '6.00', isLegallyRequired: true }),
      allocation(),
      '2080',
    )
    expect(rate(credit.hourly)).toBe('0.0000')
    expect(credit.legallyRequired).toBe(true)
  })

  it('credits nothing when there is no number to work from', () => {
    expect(rate(planCredit(plan(), allocation(), '2080').hourly)).toBe('0.0000')
  })

  it('credits nothing rather than dividing by zero hours', () => {
    const credit = planCredit(plan({ annualCost: '7200.00' }), allocation(), '0')
    expect(rate(credit.hourly)).toBe('0.0000')
  })
})

describe('is the supplement covered', () => {
  const credit = (hourly: string, funding: FringePlanInput['funding'] = 'plan_contribution') => ({
    planId: 'plan-1',
    name: 'Local 3 Health Fund',
    kind: 'health_welfare' as const,
    funding,
    hourly: dec(hourly),
    missingAnnualBasis: false,
    legallyRequired: false,
  })

  it('adds the plan and the cash and reports what is missing', () => {
    const position = fringePosition([credit('6.00')], dec('0'), dec('10.00'))
    expect(rate(position.shortfallHourly)).toBe('4.0000')
    expect(position.status).toBe('plan')
  })

  it('never turns a surplus into a negative shortfall', () => {
    const position = fringePosition([credit('12.00')], dec('0'), dec('10.00'))
    expect(rate(position.shortfallHourly)).toBe('0.0000')
  })

  it('knows cash, a plan, both and neither', () => {
    expect(fringePosition([], dec('10'), dec('10')).status).toBe('cash')
    expect(fringePosition([credit('10')], dec('0'), dec('10')).status).toBe('plan')
    expect(fringePosition([credit('6')], dec('4'), dec('10')).status).toBe('mixed')
    expect(fringePosition([], dec('0'), dec('10')).status).toBe('missing')
  })

  it('counts a cash in lieu plan as cash, not as a plan credit', () => {
    const position = fringePosition([credit('10.00', 'cash_in_lieu')], dec('0'), dec('10.00'))
    expect(position.status).toBe('cash')
    expect(rate(position.cashHourly)).toBe('10.0000')
  })
})

describe('which allocations are in force', () => {
  const rows = [
    allocation({ planId: 'a', effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30' }),
    allocation({ planId: 'b', effectiveFrom: '2026-07-01', effectiveTo: null }),
    allocation({ planId: 'c', effectiveFrom: '2026-10-01', effectiveTo: null }),
  ]

  it('keeps the ones that cover the date', () => {
    expect(allocationsOn(rows, '2026-09-12').map((row) => row.planId)).toEqual(['b'])
    expect(allocationsOn(rows, '2026-03-01').map((row) => row.planId)).toEqual(['a'])
    expect(allocationsOn(rows, '2026-12-01').map((row) => row.planId)).toEqual(['b', 'c'])
  })
})

describe('apprentices', () => {
  const record = (partial: Partial<ApprenticeRecordInput> = {}): ApprenticeRecordInput => ({
    programName: 'Mid-Hudson Electrical Apprenticeship Program',
    periodNo: 2,
    pctOfJourney: '55.00',
    validFrom: '2026-03-01',
    validTo: null,
    ...partial,
  })

  it('pays a percentage of the journeyworker rate', () => {
    expect(money(apprenticeRate(dec('63.20'), '55.00'))).toBe('34.76')
    expect(money(apprenticeRate(dec('44.85'), '85.00'))).toBe('38.12')
  })

  it('covers a work date only inside its own validity', () => {
    expect(recordCovers(record(), '2026-09-12')).toBe(true)
    expect(recordCovers(record(), '2026-02-01')).toBe(false)
    expect(recordCovers(record({ validTo: '2026-08-01' }), '2026-09-12')).toBe(false)
  })

  it('reads the ratio as it is written in the programme', () => {
    expect(parseRatio('1:1')).toEqual({ apprentices: 1, journeyworkers: 1 })
    expect(parseRatio(' 2 : 3 ')).toEqual({ apprentices: 2, journeyworkers: 3 })
    expect(parseRatio('one to one')).toBeNull()
    expect(parseRatio('1:0')).toBeNull()
  })

  it('counts how many apprentices a crew may carry', () => {
    const oneToThree = { apprentices: 1, journeyworkers: 3 }
    expect(money(allowedApprentices(oneToThree, 3))).toBe('1.00')
    expect(money(allowedApprentices(oneToThree, 0))).toBe('0.00')
    expect(ratioExceeded(oneToThree, 2, 3)).toBe(true)
    expect(ratioExceeded(oneToThree, 1, 3)).toBe(false)
    expect(ratioExceeded({ apprentices: 1, journeyworkers: 1 }, 1, 1)).toBe(false)
  })
})

describe('a monthly premium as a credit per hour (spec/03 §4.6, golden 6 in spec/01 §5)', () => {
  it('600 a month over 2,080 hours is 3.46 an hour', () => {
    const out = monthlyPremiumCredit('600.00', '2080')
    expect(out && money(out.yearly)).toBe('7200.00')
    expect(out && rate(out.hourly)).toBe('3.4615')
    expect(out && money(out.hourly)).toBe('3.46')
  })

  it('divides by the hours it is given, 1,820 for 7-hour days', () => {
    const out = monthlyPremiumCredit('600.00', '1820')
    expect(out && money(out.hourly)).toBe('3.96')
  })

  it('has no answer without hours above zero or a premium', () => {
    expect(monthlyPremiumCredit('600.00', '0')).toBeNull()
    expect(monthlyPremiumCredit('', '2080')).toBeNull()
    expect(monthlyPremiumCredit('abc', '2080')).toBeNull()
  })
})
