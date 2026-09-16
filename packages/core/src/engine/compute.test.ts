import { describe, expect, it } from 'vitest'
import { classification, entries, week, worker } from '../__testing__/build.ts'
import { computeWeek } from './compute.ts'

/**
 * The two examples spec/01 §2.1 says the engine must get right. They are the
 * whole reason the overtime codes are read from the wage schedule instead of
 * assumed: the same nine hours are worth 26.50 under code B and 27.75 under
 * code W, and the difference is a supplement that must not be multiplied.
 */
describe('the ninth hour (spec/01 §2.1)', () => {
  const nineHours = entries([null, null, null, '9', null, null, null])

  it('code B: 16.00 base and 2.50 supplement make 26.50, not 27.75', () => {
    const result = computeWeek(week({ entries: nineHours }))
    const row = result.rows[0]
    expect(row?.stHours).toBe('8.00')
    expect(row?.otHours).toBe('1.00')
    expect(row?.otRate).toBe('24.00')
    expect(row?.otSupplementRate).toBe('2.50')
    expect(row?.otHourlyTotal).toBe('26.50')
  })

  it('code W: the supplement carries the premium too, so 27.75', () => {
    const result = computeWeek(
      week({
        classifications: [classification({ otCodes: ['B', 'W'] })],
        entries: nineHours,
      }),
    )
    const row = result.rows[0]
    expect(row?.otRate).toBe('24.00')
    expect(row?.otSupplementRate).toBe('3.75')
    expect(row?.otHourlyTotal).toBe('27.75')
  })

  it('code V: the supplement carries the same premium as the hour', () => {
    const result = computeWeek(
      week({
        classifications: [classification({ otCodes: ['D', 'V'] })],
        entries: nineHours,
      }),
    )
    const row = result.rows[0]
    expect(row?.otRate).toBe('32.00')
    expect(row?.otSupplementRate).toBe('5.00')
    expect(row?.otHourlyTotal).toBe('37.00')
  })
})

describe('two rules over the same hours (spec/01 §2.1)', () => {
  it('takes the NY split when the daily code pays more', () => {
    // 4 days of 10 hours and one of 5: NY code B gives 8 overtime hours,
    // the federal 40 hour rule gives 5. NY pays more, so NY wins.
    const result = computeWeek(
      week({
        tenant: { federalOtEnabled: true },
        entries: entries([null, '10', '10', '10', '10', '5', null]),
      }),
    )
    const row = result.rows[0]
    expect(row?.otHours).toBe('8.00')
    expect(row?.stHours).toBe('37.00')
    expect(result.workers[0]?.otMethod).toBe('ny')
    expect(row?.grossProject).toBe('784.00')
  })

  it('takes the federal split when the NY codes give no premium', () => {
    // Five 9 hour days with no daily code: NY gives nothing, the federal rule
    // gives 5 hours over 40.
    const result = computeWeek(
      week({
        classifications: [classification({ otCodes: ['E'] })],
        entries: entries([null, '9', '9', '9', '9', '9', null]),
      }),
    )
    expect(result.rows[0]?.otHours).toBe('5.00')
    expect(result.rows[0]?.stHours).toBe('40.00')
    expect(result.workers[0]?.otMethod).toBe('federal')
    expect(result.workers[0]?.grossThisProject).toBe('760.00')
  })

  it('leaves every hour straight time when neither rule applies', () => {
    const result = computeWeek(
      week({
        tenant: { federalOtEnabled: false },
        project: {
          id: 'p-1',
          name: 'Private work',
          nyReporting: false,
          federalReporting: false,
          startDate: '2026-04-06',
        },
        classifications: [classification({ otCodes: [] })],
        entries: entries([null, '9', '9', '9', '9', '9', null]),
      }),
    )
    expect(result.rows[0]?.otHours).toBe('0.00')
    expect(result.rows[0]?.stHours).toBe('45.00')
  })
})

describe('weighted average (spec/01 §2.2, 29 CFR 778.115)', () => {
  it('uses total earnings over total hours when a worker holds two classifications', () => {
    const result = computeWeek(
      week({
        classifications: [
          classification({ otCodes: [] }),
          classification({
            id: 'pc-2',
            classificationId: 'cls-2',
            officialLabel: 'Laborer – Group 1',
            displayLabel: 'Laborer – Group 1',
            wdBaseRate: '20.00',
            paidBaseRate: '20.00',
          }),
        ],
        entries: [
          ...entries([null, '8', '8', '8', '8', '8', null]),
          ...entries([null, null, null, null, null, '5', null], { classificationId: 'cls-2' }),
        ],
      }),
    )
    const first = result.workers[0]
    // 40 hours at 16.00 and 5 at 20.00 is 740.00 over 45 hours.
    expect(first?.regularRate).toBe('16.4444')
    expect(first?.regularRateMethod).toBe('weighted_average')
    expect(first?.otHours).toBe('5.00')
    expect(result.findings.some((f) => f.code === 'WEIGHTED_AVERAGE_USED')).toBe(true)
  })
})

describe('the grid contract (spec/19 §3)', () => {
  it('orders the seven columns from weekEnding minus six days', () => {
    const result = computeWeek(
      week({ entries: entries([null, '8', null, null, null, null, null]) }),
    )
    expect(result.days).toEqual([
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ])
    expect(result.rows[0]?.id).toBe('w-1:cls-1')
    expect(result.rows[0]?.days).toHaveLength(7)
    expect(result.totals.byDay).toHaveLength(7)
  })

  it('keeps a worker with no hours out of the rows', () => {
    const result = computeWeek(
      week({
        workers: [worker(), worker({ id: 'w-2', firstName: 'Ann', lastName: 'Roe' })],
        entries: entries([null, '8', null, null, null, null, null]),
      }),
    )
    expect(result.rows).toHaveLength(1)
    expect(result.workers).toHaveLength(1)
  })
})
