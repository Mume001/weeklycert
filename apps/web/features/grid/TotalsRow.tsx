'use client'

// The sticky totals row (spec/14 §7: 44 px, bottom, z-index 3).
import { copy } from '@wc/copy'
import { dec, hours as sumHours } from '@wc/core'
import type { WeekGridDTO } from '@wc/data/dto'
import { Hours } from '@/components/patterns/Hours'
import { Money } from '@/components/patterns/Money'

/** Hours are decimal strings; they are added with decimal.js, never as floats. */
const add = (a: string, b: string) => sumHours(dec(a).plus(dec(b)))

export function TotalsRow({ totals }: { totals: WeekGridDTO['totals'] }) {
  return (
    <tfoot>
      <tr>
        <th scope="row" className="grid__worker text-left">
          {copy.grid.weekTotal}
        </th>
        <td />
        <td />
        {totals.byDay.map((value, day) => (
          <td
            // The seven columns are positional; the date is in the header.
            // biome-ignore lint/suspicious/noArrayIndexKey: a week is seven fixed slots
            key={day}
            className="grid__day"
          >
            <Hours value={value} />
          </td>
        ))}
        <td className="grid__num">
          <Hours value={add(totals.st, totals.ot)} />
        </td>
        <td className="grid__num">
          <Hours value={totals.st} />
        </td>
        <td className="grid__num">
          <Hours value={totals.ot} />
        </td>
        <td />
        <td />
        <td />
        <td className="grid__num">
          <Money value={totals.gross} />
        </td>
      </tr>
    </tfoot>
  )
}
