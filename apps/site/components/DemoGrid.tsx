'use client'

// The interactive demo (spec/16 §4 row 7, 20 O): the grid on one made-up week,
// with the real engine from @wc/core, so every change runs the same checks the
// product runs. No form, nothing is sent anywhere. It ends on the review of
// the week, before the signature.
import { copy, count, fill } from '@wc/copy'
import { computeWeek, type WeekInput } from '@wc/core'
import { useMemo, useState } from 'react'
import demoWeek from './demo-week.json'

const d = copy.site.demo
const base = demoWeek as WeekInput

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
const hoursText = (value: string) => (Number(value) === 0 ? '' : String(Number(value)))

/** One cell's text back into the week: empty is no entry, a number is hours. */
function withCell(
  input: WeekInput,
  workerId: string,
  classificationId: string,
  date: string,
  text: string,
): WeekInput {
  const others = input.entries.filter(
    (e) =>
      !(e.workerId === workerId && e.classificationId === classificationId && e.workDate === date),
  )
  const hours = text.trim()
  if (hours === '' || !/^\d{1,2}(\.\d{1,2})?$/.test(hours)) return { ...input, entries: others }
  const template = input.entries.find((e) => e.workerId === workerId) ?? input.entries[0]
  if (!template) return input
  return {
    ...input,
    entries: [
      ...others,
      {
        ...template,
        workerId,
        classificationId,
        workDate: date,
        hours,
        stOverride: null,
        otOverride: null,
      },
    ],
  }
}

export default function DemoGrid() {
  const [input, setInput] = useState<WeekInput>(base)
  const [typed, setTyped] = useState<Record<string, string>>({})
  const [reviewing, setReviewing] = useState(false)
  const result = useMemo(() => computeWeek(input), [input])
  const hard = result.findings.filter((f) => f.severity === 'hard')
  const soft = result.findings.filter((f) => f.severity === 'soft')

  if (reviewing) {
    return (
      <div className="grid gap-4" data-testid="demo-review">
        <h3 className="font-semibold text-xl">{d.reviewTitle}</h3>
        <div className="overflow-x-auto rounded-lg border border-border-decorative bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2">{d.columns.worker}</th>
                <th className="px-3 py-2">{d.columns.classification}</th>
                <th className="px-3 py-2 text-right">{d.columns.hours}</th>
                <th className="px-3 py-2 text-right">{d.columns.overtime}</th>
                <th className="px-3 py-2 text-right">{d.columns.gross}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="border-t border-border-decorative">
                  <td className="px-3 py-2 font-semibold">{row.workerName}</td>
                  <td className="px-3 py-2">{row.classificationName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(row.stHours)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(row.otHours)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {money.format(Number(row.grossProject))}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border-decorative font-semibold">
                <td className="px-3 py-2" colSpan={2}>
                  {d.totalRow}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(result.totals.st)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(result.totals.ot)}</td>
                <td className="px-3 py-2 text-right tabular-nums" data-testid="demo-gross">
                  {money.format(Number(result.totals.gross))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-text-secondary">{d.reviewNote}</p>
        <div>
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="rounded-md border border-border-interactive bg-white px-4 py-2 font-semibold text-sm hover:bg-n-50 focus-visible:focus-ring"
          >
            {d.back}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary md:hidden">{d.narrow}</p>
      <div className="overflow-x-auto rounded-lg border border-border-decorative bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">{d.worker}</th>
              {result.days.map((day) => (
                <th key={day} className="px-1 py-2 text-center">
                  {dayLabel(day)}
                </th>
              ))}
              <th className="px-3 py-2 text-right">{d.total}</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id} className="border-t border-border-decorative" data-testid="demo-row">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  <span className="block font-semibold text-text-primary">{row.workerName}</span>
                  <span className="block text-xs text-text-secondary">
                    {row.classificationName}
                  </span>
                </th>
                {row.days.map((day) => {
                  const key = `${row.id}|${day.date}`
                  const shown = typed[key] ?? hoursText(String(Number(day.st) + Number(day.ot)))
                  return (
                    <td key={day.date} className="px-1 py-1.5 text-center">
                      <input
                        aria-label={fill(d.cell, {
                          Worker: row.workerName,
                          day: dayLabel(day.date),
                        })}
                        inputMode="decimal"
                        value={shown}
                        onChange={(e) => {
                          const text = e.target.value
                          setTyped((now) => ({ ...now, [key]: text }))
                          setInput((now) =>
                            withCell(now, row.workerId, row.classificationId, day.date, text),
                          )
                        }}
                        className="h-8 w-12 rounded border border-border-interactive text-center tabular-nums focus-visible:focus-ring"
                      />
                    </td>
                  )
                })}
                <td
                  className="px-3 py-1.5 text-right font-semibold tabular-nums"
                  data-testid="demo-total"
                >
                  {Number(row.totalHours)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section
        aria-labelledby="demo-checks"
        className="grid gap-2 rounded-lg border border-border-decorative bg-white p-4"
      >
        <h3 id="demo-checks" className="font-semibold text-md">
          {d.checks}
          <span className="ml-3 text-sm font-normal text-text-secondary" data-testid="demo-counts">
            {count(d, 'errors', hard.length)} · {count(d, 'warnings', soft.length)}
          </span>
        </h3>
        {hard.length + soft.length === 0 ? (
          <p className="text-sm text-text-secondary">{d.clear}</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {[...hard, ...soft].map((f) => (
              <li
                // A finding has no id; what it is about makes it one within a week.
                key={`${f.code}|${f.workerId ?? ''}|${f.classificationId ?? ''}|${f.workDate ?? ''}|${f.field ?? ''}`}
                className={f.severity === 'hard' ? 'text-error-600' : 'text-warning-700'}
              >
                {f.message}
              </li>
            ))}
          </ul>
        )}
      </section>
      <div>
        <button
          type="button"
          onClick={() => setReviewing(true)}
          disabled={hard.length > 0}
          className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-sm text-white hover:bg-teal-800 focus-visible:focus-ring disabled:cursor-not-allowed disabled:bg-n-300"
        >
          {d.review}
        </button>
      </div>
    </div>
  )
}
