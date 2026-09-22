import { copy } from '@wc/copy'
import type { ReviewWorker } from '@wc/data/dto'
import { Hours } from '@/components/patterns/Hours'
import { Money } from '@/components/patterns/Money'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const t = copy.review.columns

/**
 * The week per worker (spec/03 §4.5), in the shape WH-347 prints: one line per
 * classification worked, and the payroll figures once on the worker's first
 * line, because gross for all work, deductions and net are not per
 * classification (spec/05 §4.2).
 *
 * The viewer never sees deductions or net pay (spec/02 §3), so the columns are
 * not rendered at all rather than blanked.
 */
export function ReviewSummary({
  workers,
  showPayroll,
}: {
  workers: ReviewWorker[]
  showPayroll: boolean
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t.worker}</TableHead>
            <TableHead>{t.classification}</TableHead>
            <TableHead className="text-right">{t.st}</TableHead>
            <TableHead className="text-right">{t.ot}</TableHead>
            <TableHead className="text-right">{t.stRate}</TableHead>
            <TableHead className="text-right">{t.otRate}</TableHead>
            <TableHead className="text-right">{t.fringeCredit}</TableHead>
            <TableHead className="text-right">{t.grossProject}</TableHead>
            {showPayroll && (
              <>
                <TableHead className="text-right">{t.grossAllWork}</TableHead>
                <TableHead className="text-right">{t.deductions}</TableHead>
                <TableHead className="text-right">{t.netPay}</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.flatMap((worker) =>
            worker.lines.map((line, index) => (
              <TableRow key={`${worker.workerId}:${line.classificationName}`}>
                {index === 0 ? (
                  <TableCell rowSpan={worker.lines.length} className="h-10 align-top font-semibold">
                    <span className="flex items-center gap-1.5">
                      {worker.workerName}
                      <span
                        title={copy.grid.columns.level}
                        className="rounded-sm border border-n-300 px-1 text-2xs font-semibold text-n-700"
                      >
                        {worker.level}
                      </span>
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="h-10">{line.classificationName}</TableCell>
                <TableCell className="h-10 text-right tabular-nums">
                  <Hours value={line.stHours} />
                </TableCell>
                <TableCell className="h-10 text-right tabular-nums">
                  <Hours value={line.otHours} />
                </TableCell>
                <TableCell className="h-10 text-right tabular-nums">
                  <Money value={line.stRate} />
                </TableCell>
                <TableCell className="h-10 text-right tabular-nums">
                  <Money value={line.otRate} />
                </TableCell>
                <TableCell className="h-10 text-right tabular-nums">
                  <Money value={line.fringeCredit} />
                </TableCell>
                <TableCell className="h-10 text-right tabular-nums">
                  <Money value={line.grossProject} />
                </TableCell>
                {showPayroll && index === 0 ? (
                  <>
                    <TableCell
                      rowSpan={worker.lines.length}
                      className="h-10 text-right align-top tabular-nums"
                    >
                      <Money value={worker.grossAllWork} />
                    </TableCell>
                    <TableCell
                      rowSpan={worker.lines.length}
                      className="h-10 text-right align-top tabular-nums"
                    >
                      <Money value={worker.deductionsTotal} />
                    </TableCell>
                    <TableCell
                      rowSpan={worker.lines.length}
                      className="h-10 text-right align-top tabular-nums"
                    >
                      <Money value={worker.netPay} />
                    </TableCell>
                  </>
                ) : null}
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </div>
  )
}
