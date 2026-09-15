# Demo data (spec/19 §4)

**Everything here is invented.** Rates are not copied from a real wage schedule.
The PRC number format is unverified (spec/13 A6). Nothing in these files may be
used for a real calculation or a real filing.

- Hudson Electric LLC (`hudson-electric`), week ends Saturday, today is
  `MOCK_TODAY` = 2026-09-15.
- Riverside Mechanical (`riverside-mechanical`) exists only so the company
  switcher and `/firms` have something to show the bookkeeper. It is on a trial
  and has no projects yet.
- One demo user per role (`owner@`, `admin@`, `payroll@`, `signer@`, `viewer@`,
  `bookkeeper@`, `super@`). Emails use the reserved `.test` domain.

## Weeks

| Project | Weeks | Rows | Detail |
|---|---|---|---|
| Dutchess County Courthouse Lighting | 23 | 24 | 2026-08-08 has v1 `corrected` and v2 `submitted` |
| Kingston WTP Electrical Upgrade (federal) | 15 | 15 | 2026-08-29 is a no-work week |
| Beacon HS Fire Alarm Replacement (completed) | 24 | 24 | last week is final |

Historical weeks carry only totals (`summary`). Time entries exist only for the
detailed weeks on project 1: 2026-08-08 (both rows), 08-15, 08-22, 08-29, 09-05
and 09-12. Open weeks: exactly three (09-05 and 09-12 on project 1, 09-12 on
project 2).

## Week 2026-09-05, the intended findings

| Code | Where it comes from |
|---|---|
| `WORKER_ADDRESS_MISSING` | Haddad, Omar has no address (hired 2026-08-31) |
| `RATE_EXPIRED` | Walsh, Kevin on Ironworker, whose only rate on this project ended 2026-06-30 |
| `DAY_OVER_24`, `DAY_OVER_16` | Kowalski, Pete: 14 h Laborer + 12 h Operating Engineer on Wed 2026-09-02 |
| `FRINGE_NOT_ANNUALIZED` | Walsh's Ironworkers Annuity Fund has an annual cost and no hours basis |
| `APPRENTICE_PCT_MISMATCH` | Petrov, Ivan (level 5, 85 %) paid 35.88, which is 80 % of 44.85 (`paidStRate`) |

**To be confirmed in session B.** The engine's exact input model is written in
step 2. Two things are known to be open until then: payroll-side inputs (gross
for all work, deductions, net) are not in the fixtures yet, so the engine must
not raise `GROSS_ALL_MISSING` or `NET_MISMATCH` for weeks that have no payroll
import; and a test in session B has to prove that this week yields exactly
3 hard and 3 soft findings.

The portal rejection text on 2026-08-15 is invented; the real format of the
portal's error messages is not verified.
