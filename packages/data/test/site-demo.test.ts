// The site's demo week (spec/16 §4 row 7) is made from the fixtures, never by
// hand. It is committed to apps/site, which has no data package; this test
// fails when the committed file and the fixtures drift apart, and rewrites it
// with UPDATE_SITE_DEMO=1.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computeWeek } from '@wc/core'
import { describe, expect, it } from 'vitest'
import { resetMockDb } from '../src/mock/db.ts'
import { siteDemoWeek } from '../src/mock/site-demo.ts'
import { resetWeekEdits } from '../src/mock/week-grid.ts'

const file = fileURLToPath(new URL('../../../apps/site/components/demo-week.json', import.meta.url))

describe('the site demo week', () => {
  it('is the fixtures week, without personal details, and has no blocking finding', () => {
    resetMockDb()
    resetWeekEdits()
    const week = siteDemoWeek()
    if (process.env.UPDATE_SITE_DEMO === '1') {
      writeFileSync(file, `${JSON.stringify(week, null, 2)}\n`)
    }
    // The content, not the layout: the formatter may lay the file out its own way.
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(JSON.parse(JSON.stringify(week)))
    for (const w of week.workers) {
      expect(w.ssnLast4).toBe('0000')
      expect(w.address?.address1).toBe('100 Demo Road')
    }
    const result = computeWeek(week)
    expect(result.findings.filter((f) => f.severity === 'hard')).toEqual([])
    expect(result.rows.length).toBeGreaterThan(3)
  })
})
