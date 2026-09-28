// The week the site's interactive demo runs on (spec/16 §4 row 7, 20 O): one
// week of the fixtures, as the engine takes it, without a single personal
// detail. The site is public and static, so the worker's address, the last
// four of the SSN and the date of birth are replaced with the same obvious
// demo values for everyone; the names are the fixtures' made-up ones.
import type { WeekInput } from '@wc/core'
import { buildWeekInput } from './week-grid.ts'

const DUTCHESS = '01924000-0000-7000-8000-000000000001'
/** The open week of the fixtures with hours and no blocking finding. */
const WEEK = '2026-09-12'

const DEMO_ADDRESS = {
  address1: '100 Demo Road',
  address2: null,
  city: 'Poughkeepsie',
  state: 'NY',
  postalCode: '12601',
  postalCodeExt: null,
}

export function siteDemoWeek(): WeekInput {
  const input = buildWeekInput(DUTCHESS, WEEK)
  return {
    ...input,
    intent: 'edit',
    workers: input.workers.map((w) => ({
      ...w,
      ssnLast4: '0000',
      dateOfBirth: null,
      address: DEMO_ADDRESS,
    })),
  }
}
