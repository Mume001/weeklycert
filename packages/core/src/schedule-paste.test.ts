// Rows pasted from a wage schedule (spec/03 §4.3 step 3). The layout of real
// copied text is NEPROVJERENO until a schedule is in izvori/ (spec/13 A15);
// these tests pin the assumption, so a real sample that breaks it fails here.
import { describe, expect, it } from 'vitest'
import { parseScheduleText } from './schedule-paste.ts'

const OFFICIAL = [
  'Electrician – Inside Wireman',
  'Laborer – Group 1',
  'Operating Engineer – Class A',
]

describe('parseScheduleText', () => {
  it('reads name, base, supplement and OT codes split by tabs', () => {
    const [row] = parseScheduleText(
      'Electrician – Inside Wireman\t$63.20\t$52.45\tA, W, R',
      OFFICIAL,
    )
    expect(row).toEqual({
      line: 1,
      text: 'Electrician – Inside Wireman',
      label: 'Electrician – Inside Wireman',
      baseRate: '63.20',
      supplement: '52.45',
      otCodes: ['A', 'W', 'R'],
      issue: null,
    })
  })

  it('reads columns split by two or more spaces, and money with commas', () => {
    const [row] = parseScheduleText('Laborer – Group 1     1,041.50    30.00   B E1', OFFICIAL)
    expect(row).toMatchObject({ baseRate: '1041.50', supplement: '30.00', otCodes: ['B', 'E1'] })
  })

  it('matches the official name when the paste turned the dash into a hyphen or changed the case', () => {
    const rows = parseScheduleText(
      'operating engineer - class a\t71.10\t44.05\tA\nLaborer — Group 1\t40.00\t30.00\tB',
      OFFICIAL,
    )
    expect(rows.map((r) => r.label)).toEqual(['Operating Engineer – Class A', 'Laborer – Group 1'])
  })

  it('says why a line cannot be added', () => {
    const rows = parseScheduleText(
      [
        'Plumber – Journeyman\t60.00\t40.00\tA',
        'Laborer – Group 1\tsee note',
        'Electrician – Inside Wireman\t63.20\t52.45',
        'Laborer – Group 1\t40.00\t30.00\tZZ',
      ].join('\n'),
      OFFICIAL,
    )
    expect(rows.map((r) => r.issue)).toEqual(['notOfficial', 'noRate', 'noOtCodes', 'noOtCodes'])
  })

  it('skips blank lines but keeps the line numbers of the paste', () => {
    const rows = parseScheduleText('\n\nLaborer – Group 1\t40.00\t30.00\tB\n   \n', OFFICIAL)
    expect(rows.map((r) => r.line)).toEqual([3])
  })
})
