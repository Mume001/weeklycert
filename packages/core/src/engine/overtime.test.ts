// One test per family of overtime code (spec/01 §2.1). The legend is the only
// place these numbers come from; if a wage schedule ever disagrees, the legend
// in ot-codes.ts is what gets corrected, never a case here.
import { describe, expect, it } from 'vitest'
import { dayOfWeek } from '../dates.ts'
import { dec, hours, money, ZERO } from '../money.ts'
import {
  isKnownOtCode,
  makeupCodes,
  OT_CODES,
  supplementPremium,
  weekendCodes,
} from './ot-codes.ts'
import {
  type Cell,
  federalOvertime,
  federalWage,
  mergePremiums,
  nyWage,
  regularRate,
  splitByCodes,
} from './overtime.ts'

function cell(date: string, hoursWorked: string, codes: string[], extra: Partial<Cell> = {}): Cell {
  return {
    rowKey: 'w-1:cls-1',
    date,
    dow: dayOfWeek(date),
    hours: dec(hoursWorked),
    isHoliday: false,
    holidayMultiplier: null,
    manualSt: null,
    manualOt: null,
    otCodes: codes,
    rate: dec('20.00'),
    ...extra,
  }
}

const MON = '2026-09-07'
const TUE = '2026-09-08'
const WED = '2026-09-09'
const THU = '2026-09-10'
const FRI = '2026-09-11'
const SAT = '2026-09-12'
const SUN = '2026-09-06'

function split(cells: Cell[]) {
  return splitByCodes(cells).map((item) => ({
    st: hours(item.st),
    ot: hours(item.ot),
    premium: hours(item.otMultiplierHours),
  }))
}

describe('daily codes', () => {
  it('AA, A and B start the premium at 7.5, 7 and 8 hours', () => {
    expect(split([cell(MON, '9', ['AA'])])[0]).toEqual({
      st: '7.50',
      ot: '1.50',
      premium: '2.25',
    })
    expect(split([cell(MON, '9', ['A'])])[0]).toEqual({ st: '7.00', ot: '2.00', premium: '3.00' })
    expect(split([cell(MON, '9', ['B'])])[0]).toEqual({ st: '8.00', ot: '1.00', premium: '1.50' })
  })

  it('C, C1, D and D1 are the same thresholds at double time', () => {
    expect(split([cell(MON, '9', ['C'])])[0]).toEqual({ st: '7.00', ot: '2.00', premium: '4.00' })
    expect(split([cell(MON, '9', ['C1'])])[0]).toEqual({ st: '7.50', ot: '1.50', premium: '3.00' })
    expect(split([cell(MON, '9', ['D'])])[0]).toEqual({ st: '8.00', ot: '1.00', premium: '2.00' })
    expect(split([cell(MON, '10', ['D1'])])[0]).toEqual({ st: '9.00', ot: '1.00', premium: '2.00' })
  })

  it('B1 pays the 9th and 10th hour at 1.5 and everything above at 2', () => {
    expect(split([cell(MON, '11', ['B1'])])[0]).toEqual({
      st: '8.00',
      ot: '3.00',
      premium: '5.00',
    })
  })

  it('B1 on a Saturday pays the first 8 hours at 1.5 and the rest at 2', () => {
    expect(split([cell(SAT, '10', ['B1'])])[0]).toEqual({
      st: '0.00',
      ot: '10.00',
      premium: '16.00',
    })
  })

  it('keeps the highest premium when two codes cover the same hour', () => {
    expect(split([cell(MON, '9', ['B', 'D'])])[0]).toEqual({
      st: '8.00',
      ot: '1.00',
      premium: '2.00',
    })
  })
})

describe('weekend and weekly codes', () => {
  it('E1 pays the first 4 Saturday hours at 1.5 and the rest at 2', () => {
    expect(split([cell(SAT, '6', ['B', 'E1'])])[0]).toEqual({
      st: '0.00',
      ot: '6.00',
      premium: '10.00',
    })
  })

  it('E5 starts double time after 8 hours on a Saturday', () => {
    expect(split([cell(SAT, '10', ['E5'])])[0]).toEqual({
      st: '8.00',
      ot: '2.00',
      premium: '4.00',
    })
  })

  it('S1 pays 2.5 for the first 8 Sunday hours and 1.5 above', () => {
    expect(split([cell(SUN, '10', ['S1'])])[0]).toEqual({
      st: '0.00',
      ot: '10.00',
      premium: '23.00',
    })
  })

  it('leaves a weekday alone when the code is only about the weekend', () => {
    expect(split([cell(MON, '10', ['E', 'F', 'L'])])[0]).toEqual({
      st: '10.00',
      ot: '0.00',
      premium: '0.00',
    })
  })

  it('B2 counts the whole week, across classifications', () => {
    const week = [
      cell(MON, '9', ['B2']),
      cell(TUE, '9', ['B2']),
      cell(WED, '9', ['B2']),
      cell(THU, '9', ['B2']),
      cell(FRI, '9', ['B2']),
    ]
    const result = split(week)
    // 36 hours are behind the fifth day, so 4 of its 9 hours are still straight.
    expect(result[3]).toEqual({ st: '9.00', ot: '0.00', premium: '0.00' })
    expect(result[4]).toEqual({ st: '4.00', ot: '5.00', premium: '7.50' })
  })

  it('B3 counts only the hours that are still straight time', () => {
    const week = [
      cell(MON, '9', ['B3']),
      cell(TUE, '9', ['B3']),
      cell(WED, '9', ['B3']),
      cell(THU, '9', ['B3']),
      cell(FRI, '9', ['B3']),
    ]
    const result = split(week)
    expect(result[4]).toEqual({ st: '4.00', ot: '5.00', premium: '7.50' })
  })
})

describe('holidays (spec/01 §2.1, legend of the dates is spec/13 A10)', () => {
  it('pays nothing extra on a day the user did not mark', () => {
    expect(split([cell(MON, '8', ['R'])])[0]).toEqual({
      st: '8.00',
      ot: '0.00',
      premium: '0.00',
    })
  })

  it('uses the multiplier of the code once the day is marked', () => {
    const marked = cell(MON, '8', ['R'], { isHoliday: true })
    expect(split([marked])[0]).toEqual({ st: '0.00', ot: '8.00', premium: '16.00' })
  })

  it('lets a confirmed multiplier win over the code', () => {
    const marked = cell(MON, '8', ['R'], { isHoliday: true, holidayMultiplier: dec('2.5') })
    expect(split([marked])[0]).toEqual({ st: '0.00', ot: '8.00', premium: '20.00' })
  })

  it('pays nothing extra when the classification carries no holiday code', () => {
    const marked = cell(MON, '8', ['B'], { isHoliday: true })
    expect(split([marked])[0]).toEqual({ st: '8.00', ot: '0.00', premium: '0.00' })
  })
})

describe('the make-up codes never pay a premium of their own', () => {
  it('E2, E3 and E4 leave the hours as they are', () => {
    expect(split([cell(SAT, '8', ['E2'])])[0]?.ot).toBe('0.00')
    expect(split([cell(SAT, '8', ['E3'])])[0]?.ot).toBe('0.00')
    expect(split([cell(SUN, '8', ['E4'])])[0]?.ot).toBe('0.00')
    expect(makeupCodes(['B', 'E2', 'O'])).toEqual(['E2'])
  })

  it('X carries no wage premium until the wording is copied (spec/13 A13)', () => {
    expect(split([cell(MON, '10', ['X'])])[0]?.ot).toBe('0.00')
  })
})

describe('the user typed the split', () => {
  it('honours it and pays the overtime at the highest premium of the day', () => {
    const manual = cell(MON, '10', ['D'], { manualSt: dec('9'), manualOt: dec('1') })
    expect(split([manual])[0]).toEqual({ st: '9.00', ot: '1.00', premium: '2.00' })
  })

  it('never pays a typed overtime hour below the federal 1.5', () => {
    const manual = cell(MON, '10', [], { manualSt: dec('8'), manualOt: dec('2') })
    expect(split([manual])[0]).toEqual({ st: '8.00', ot: '2.00', premium: '3.00' })
  })

  it('remembers what the codes would have said', () => {
    const manual = cell(MON, '10', ['B'], { manualSt: dec('10'), manualOt: dec('0') })
    const [result] = splitByCodes([manual])
    expect(hours(result?.codeSt ?? ZERO)).toBe('8.00')
    expect(hours(result?.codeOt ?? ZERO)).toBe('2.00')
  })
})

describe('the federal rule', () => {
  const week = [
    cell(MON, '9', []),
    cell(TUE, '9', []),
    cell(WED, '9', []),
    cell(THU, '9', []),
    cell(FRI, '9', []),
  ]

  it('puts every hour over 40 at the end of the week', () => {
    const overtime = federalOvertime(week).map((value) => hours(value))
    expect(overtime).toEqual(['0.00', '0.00', '0.00', '0.00', '5.00'])
  })

  it('pays straight time plus half the regular rate for those hours', () => {
    expect(money(federalWage(week, federalOvertime(week)))).toBe('950.00')
  })

  it('uses the weighted average when the rates differ (29 CFR 778.115)', () => {
    const mixed = [
      cell(MON, '40', [], { rate: dec('16') }),
      cell(TUE, '5', [], { rate: dec('20') }),
    ]
    const { value, method } = regularRate(mixed)
    expect(method).toBe('weighted_average')
    expect(money(value)).toBe('16.44')
  })

  it('is a single rate when there is only one classification', () => {
    expect(regularRate(week).method).toBe('single')
  })
})

describe('the two rules side by side', () => {
  it('code B pays more than the 40 hour rule on four tens and a five', () => {
    const week = [
      cell(MON, '10', ['B']),
      cell(TUE, '10', ['B']),
      cell(WED, '10', ['B']),
      cell(THU, '10', ['B']),
      cell(FRI, '5', ['B']),
    ]
    expect(money(nyWage(week, splitByCodes(week)))).toBe('980.00')
    expect(money(federalWage(week, federalOvertime(week)))).toBe('950.00')
  })
})

describe('the legend itself', () => {
  it('knows every code spec/01 §2.1 lists', () => {
    const expected = [
      'AA',
      'A',
      'B',
      'B1',
      'B2',
      'B3',
      'C',
      'C1',
      'D',
      'D1',
      'E',
      'E1',
      'E2',
      'E3',
      'E4',
      'E5',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'S1',
      'T',
      'U',
      'V',
      'W',
      'X',
    ]
    expect(Object.keys(OT_CODES).sort()).toEqual([...expected].sort())
    for (const code of expected) expect(isKnownOtCode(code)).toBe(true)
    expect(isKnownOtCode('ZZ')).toBe(false)
  })

  it('knows V and W are the only codes that touch a supplement', () => {
    expect(supplementPremium(['B'])).toBe('none')
    expect(supplementPremium(['B', 'V'])).toBe('same_as_overtime')
    expect(supplementPremium(['B', 'W'])).toBe('one_and_a_half')
    expect(supplementPremium(['V', 'W'])).toBe('one_and_a_half')
  })

  it('knows which codes make a weekend day premium time', () => {
    expect(weekendCodes(['B', 'E2', 'O'])).toEqual(['O'])
    expect(weekendCodes(['A', 'W', 'R'])).toEqual([])
  })
})

/**
 * Every code in the legend, one day each. A wage schedule that says something
 * else means the legend in ot-codes.ts is wrong, not this table.
 */
describe('every code in the legend pays what spec/01 §2.1 says', () => {
  const HOLIDAY = { isHoliday: true }
  const table: [string, string, string, Partial<Cell>, string, string][] = [
    ['AA', MON, '9', {}, '1.50', '2.25'],
    ['A', MON, '9', {}, '2.00', '3.00'],
    ['B', MON, '9', {}, '1.00', '1.50'],
    ['B1', MON, '11', {}, '3.00', '5.00'],
    ['B2', MON, '9', {}, '0.00', '0.00'],
    ['B3', MON, '9', {}, '0.00', '0.00'],
    ['C', MON, '9', {}, '2.00', '4.00'],
    ['C1', MON, '9', {}, '1.50', '3.00'],
    ['D', MON, '9', {}, '1.00', '2.00'],
    ['D1', MON, '10', {}, '1.00', '2.00'],
    ['E', SAT, '8', {}, '8.00', '12.00'],
    ['E1', SAT, '8', {}, '8.00', '14.00'],
    ['E2', SAT, '8', {}, '0.00', '0.00'],
    ['E3', SAT, '8', {}, '0.00', '0.00'],
    ['E4', SUN, '8', {}, '0.00', '0.00'],
    ['E5', SAT, '10', {}, '2.00', '4.00'],
    ['F', SAT, '8', {}, '8.00', '12.00'],
    ['G', SAT, '8', {}, '8.00', '12.00'],
    ['G', MON, '8', HOLIDAY, '8.00', '12.00'],
    ['H', SUN, '8', {}, '8.00', '12.00'],
    ['I', SUN, '8', {}, '8.00', '12.00'],
    ['J', SUN, '8', {}, '8.00', '12.00'],
    ['K', MON, '8', HOLIDAY, '8.00', '12.00'],
    ['L', SAT, '8', {}, '8.00', '16.00'],
    ['M', SUN, '8', {}, '8.00', '16.00'],
    ['N', MON, '8', HOLIDAY, '8.00', '16.00'],
    ['O', SAT, '8', {}, '8.00', '16.00'],
    ['P', SUN, '8', {}, '8.00', '16.00'],
    ['Q', MON, '8', HOLIDAY, '8.00', '16.00'],
    ['R', MON, '8', HOLIDAY, '8.00', '16.00'],
    ['S', MON, '8', HOLIDAY, '8.00', '20.00'],
    ['S1', MON, '8', HOLIDAY, '8.00', '20.00'],
    ['T', MON, '8', HOLIDAY, '8.00', '24.00'],
    ['U', MON, '8', HOLIDAY, '8.00', '32.00'],
    ['V', MON, '9', {}, '0.00', '0.00'],
    ['W', MON, '9', {}, '0.00', '0.00'],
    ['X', MON, '9', {}, '0.00', '0.00'],
  ]

  for (const [code, day, worked, extra, ot, premium] of table) {
    it(`${code} on ${day} with ${worked} hours`, () => {
      const result = split([cell(day, worked, [code], extra)])[0]
      expect(`${code} ot=${result?.ot} premium=${result?.premium}`).toBe(
        `${code} ot=${ot} premium=${premium}`,
      )
    })
  }

  it('touches every code the legend holds', () => {
    expect(new Set(table.map(([code]) => code)).size).toBe(Object.keys(OT_CODES).length)
  })
})

describe('merging premiums', () => {
  it('returns one straight time segment when no code applies', () => {
    const segments = mergePremiums([], dec('8'))
    expect(segments).toHaveLength(1)
    expect(hours(segments[0]?.multiplier ?? ZERO)).toBe('1.00')
  })

  it('returns nothing for a day with no hours', () => {
    expect(mergePremiums([], ZERO)).toEqual([])
  })
})
