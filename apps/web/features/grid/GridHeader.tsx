'use client'

// The sticky header: the seven day columns carry their dates, and the order is
// derived from the week ending, never a fixed Monday (spec/05 §4, spec/19 §3).
import { copy, fill } from '@wc/copy'
import type { IsoDate } from '@wc/data/dto'
import { dateParts } from '@/lib/format'

export function GridHeader({ days }: { days: IsoDate[] }) {
  const c = copy.grid.columns
  return (
    <thead>
      <tr>
        {/* One column, three pieces of data: the classification and the J/RA
            badge live inside the worker cell (spec/03 §4.5, spec/14 §7). */}
        <th scope="col" className="grid__worker">
          {c.worker}
        </th>
        {days.map((date) => {
          const part = dateParts(date)
          return (
            <th key={date} scope="col" className="grid__day">
              <time dateTime={date}>
                {fill(copy.grid.dayHeader, { WeekEndDay: part.weekdayShort, D: part.day })}
              </time>
            </th>
          )
        })}
        <th scope="col" className="grid__total">
          {c.total}
        </th>
        <th scope="col" className="grid__total">
          {c.st}
        </th>
        <th scope="col" className="grid__total">
          {c.ot}
        </th>
        <th scope="col" className="grid__total grid__derived">
          {c.stRate}
        </th>
        <th scope="col" className="grid__total grid__derived">
          {c.otRate}
        </th>
        <th scope="col" className="grid__total grid__derived">
          {c.supplement}
        </th>
        <th scope="col" className="grid__total grid__derived">
          {c.gross}
        </th>
      </tr>
    </thead>
  )
}
