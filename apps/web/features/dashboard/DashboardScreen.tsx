import { copy, fill } from '@wc/copy'
import { lastEndedWeekEnding } from '@wc/core'
import { notFound } from 'next/navigation'
import { PageBar } from '@/components/app-shell/PageBar'
import { dateParts } from '@/lib/format'
import { loadShell } from '@/lib/session'

/**
 * /app/[t]/dashboard. Session A delivers the frame only: page bar with the
 * title from spec/15 §3 and an empty content area. The dashboard itself
 * (spec/03 §4.3) is built in its own session (spec/03 §5 item 9).
 */
export async function DashboardScreen({ slug }: { slug: string }) {
  const shell = await loadShell(slug)
  if (!shell) notFound()

  const today = dateParts(shell.today)
  const week = dateParts(lastEndedWeekEnding(shell.today, shell.tenant.weekEndsOn))

  return (
    <>
      <PageBar
        title={fill(copy.dashboard.title, {
          Weekday: today.weekday,
          Month: today.month,
          D: today.day,
        })}
        meta={fill(copy.dashboard.subtitle, {
          WeekEndDay: week.weekdayShort,
          Month: week.monthShort,
          D: week.day,
        })}
        breadcrumb={[{ label: shell.tenant.legalName }]}
      />
      <div className="mx-auto w-full max-w-[1440px] p-6" />
    </>
  )
}
