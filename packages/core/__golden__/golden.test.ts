// The golden cases of spec/01 §5, plus the two worked examples from §2.1 and
// the fixture week from spec/19 §4.
//
// Each case is a folder with `input.json` and `expected.json`. The expected
// file is the whole output of the engine, so any change in a rate, an hour or a
// finding shows up as a diff a human reads. Regenerate after an intended change:
//
//   UPDATE_GOLDEN=1 npx vitest run --project core
//
// and read the diff before committing it. Never regenerate to make a red test
// green.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { computeWeek } from '../src/engine/compute.ts'

const HERE = fileURLToPath(new URL('.', import.meta.url))

const cases = readdirSync(HERE, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

describe('golden cases', () => {
  it('there are at least fifteen of them (spec/12 step 2)', () => {
    expect(cases.length).toBeGreaterThanOrEqual(15)
  })

  for (const name of cases) {
    it(name, () => {
      const input: unknown = JSON.parse(readFileSync(join(HERE, name, 'input.json'), 'utf8'))
      const result = computeWeek(input)
      const expectedPath = join(HERE, name, 'expected.json')
      if (process.env.UPDATE_GOLDEN === '1') {
        writeFileSync(expectedPath, `${JSON.stringify(result, null, 2)}\n`)
      }
      const expected: unknown = JSON.parse(readFileSync(expectedPath, 'utf8'))
      expect(result).toEqual(expected)
    })
  }
})

function run(name: string) {
  return computeWeek(JSON.parse(readFileSync(join(HERE, name, 'input.json'), 'utf8')))
}

/**
 * The numbers spec/01 and spec/19 state in words. They are already inside the
 * expected files, but a diff in a 2000 line JSON does not tell anybody which
 * rule broke; these do.
 */
describe('the numbers the spec names', () => {
  it('the ninth hour under code B is 26.50, not 27.75 (01 §2.1)', () => {
    const row = run('a-ninth-hour-code-b').rows[0]
    expect(row?.otRate).toBe('24.00')
    expect(row?.otSupplementRate).toBe('2.50')
    expect(row?.otHourlyTotal).toBe('26.50')
  })

  it('the same hour under code W is 27.75 (01 §2.1)', () => {
    const row = run('b-ninth-hour-code-w').rows[0]
    expect(row?.otHourlyTotal).toBe('27.75')
  })

  it('code B gives 8 overtime hours where the federal rule gives 5 (01 §5 case 2)', () => {
    const result = run('02-ny-code-b-vs-federal')
    expect(result.rows[0]?.otHours).toBe('8.00')
    expect(result.workers[0]?.otMethod).toBe('ny')
  })

  it('45 hours on a federal project are 40 and 5 (01 §5 case 1)', () => {
    const result = run('01-federal-45-hours')
    expect(result.rows[0]?.stHours).toBe('40.00')
    expect(result.rows[0]?.otHours).toBe('5.00')
  })

  it('600 a month over 2080 hours is a credit of 3.46 an hour (01 §5 case 6)', () => {
    expect(run('06-fringe-annualized-credit').rows[0]?.fringeCreditHourly).toBe('3.4615')
  })

  it('30 plus 10 owed against 30 plus 6 paid is 4.00 short (01 §5 case 7)', () => {
    expect(run('07-fringe-shortfall').rows[0]?.fringeShortfallHourly).toBe('4.0000')
  })

  it('the fixture week of 19 §4 has exactly 3 hard and 3 soft findings', () => {
    const findings = run('c-fixture-week-2026-09-05').findings
    const of = (severity: string) =>
      findings.filter((finding) => finding.severity === severity).map((finding) => finding.code)
    expect(of('hard').sort()).toEqual(['DAY_OVER_24', 'RATE_EXPIRED', 'WORKER_ADDRESS_MISSING'])
    expect(of('soft').sort()).toEqual([
      'APPRENTICE_PCT_MISMATCH',
      'DAY_OVER_16',
      'FRINGE_NOT_ANNUALIZED',
    ])
  })
})
