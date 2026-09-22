import { copy, fill } from '@wc/copy'
import type { ReviewDTO } from '@wc/data/dto'
import { Hours } from '@/components/patterns/Hours'
import { Money } from '@/components/patterns/Money'
import { Notice } from '@/components/patterns/Notice'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const r = copy.review

/**
 * What the two filings will hold (spec/03 §4.5). Neither is generated in this
 * phase (spec/19 §11): the XML is the static example from the fixtures and the
 * WH-347 is its page 1 columns (spec/05 §4.2) filled from this week, both said
 * to be examples in as many words.
 */
export function OutputSamples({ data }: { data: ReviewDTO }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="grid gap-2" aria-labelledby="xml-sample">
        <h2 id="xml-sample" className="text-lg font-semibold text-text-primary">
          {r.xmlCard}
        </h2>
        <p className="text-sm text-text-secondary">{r.sampleNote}</p>
        {/* It scrolls, so it takes focus (WCAG 2.1.1, axe scrollable-region-focusable). */}
        <pre
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must take focus
          tabIndex={0}
          className="max-h-[420px] overflow-auto rounded-lg bg-n-900 p-4 font-mono text-xs text-teal-100"
        >
          {data.sampleXml}
        </pre>
      </section>

      <section className="grid gap-2" aria-labelledby="wh347-sample">
        <h2 id="wh347-sample" className="text-lg font-semibold text-text-primary">
          {r.wh347Card}
        </h2>
        <p className="text-sm text-text-secondary">{r.sampleNote}</p>
        <div className="overflow-hidden rounded-lg border border-border-decorative bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{r.columns.worker}</TableHead>
                <TableHead>{r.columns.classification}</TableHead>
                <TableHead className="text-right">{r.columns.st}</TableHead>
                <TableHead className="text-right">{r.columns.ot}</TableHead>
                <TableHead className="text-right">{r.columns.stRate}</TableHead>
                <TableHead className="text-right">{r.columns.grossProject}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.workers.flatMap((worker) =>
                worker.lines.map((line) => (
                  <TableRow key={`${worker.workerId}:${line.classificationName}`}>
                    <TableCell className="h-10">
                      {worker.workerName}
                      {worker.ssnLast4 && (
                        <span className="ml-1.5 font-mono text-xs text-text-secondary">
                          {`XXX-XX-${worker.ssnLast4}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="h-10">{line.classificationName}</TableCell>
                    <TableCell className="h-10 text-right">
                      <Hours value={line.stHours} />
                    </TableCell>
                    <TableCell className="h-10 text-right">
                      <Hours value={line.otHours} />
                    </TableCell>
                    <TableCell className="h-10 text-right">
                      <Money value={line.stRate} />
                    </TableCell>
                    <TableCell className="h-10 text-right">
                      <Money value={line.grossProject} />
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-2 xl:col-span-2" aria-labelledby="by-hand">
        <h2 id="by-hand" className="text-lg font-semibold text-text-primary">
          {r.manualTitle}
        </h2>
        <p className="text-sm text-text-secondary">{r.manualSubtitle}</p>
        <dl className="grid gap-3 rounded-lg border border-border-decorative bg-white p-4 text-sm shadow-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
              {copy.projects.timeline.cards.prc}
            </dt>
            <dd className="font-mono tabular-nums">
              {data.project.prcNumber ?? copy.projects.list.notSet}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
              {copy.projects.timeline.columns.payrollNo}
            </dt>
            <dd className="tabular-nums">
              {data.period.payrollNumber ??
                (data.period.expectedPayrollNumber === null
                  ? ''
                  : fill(copy.projects.timeline.willBe, { n: data.period.expectedPayrollNumber }))}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
              {r.byHand.nysRegistration}
            </dt>
            <dd className="tabular-nums">
              {data.company.nysRegistrationNumber ?? copy.projects.list.notSet}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
              {r.byHand.fein}
            </dt>
            <dd className="tabular-nums">
              {data.company.feinLast4
                ? `XX-XXX${data.company.feinLast4}`
                : copy.projects.list.notSet}
            </dd>
          </div>
        </dl>
        <Notice tone="info" title={r.noApi} />
      </section>
    </div>
  )
}
