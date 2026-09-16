import { copy } from '@wc/copy'
import { Section, SectionHead } from './Section'

/** spec/16 §4 row 8: seven rows, the spreadsheet on the left and us on the right. */
export function Compare() {
  const c = copy.site.compare
  return (
    <Section tone="sunken">
      <SectionHead eyebrow={c.eyebrow} title={c.title} />
      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse overflow-hidden rounded-lg border border-border-decorative bg-white text-sm">
          <thead>
            <tr>
              <th className="w-1/3 bg-surface-header px-4 py-3 text-left" />
              <th className="w-1/3 bg-surface-header px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-widest">
                {c.them}
              </th>
              <th className="w-1/3 bg-teal-50 px-4 py-3 text-left font-semibold text-teal-700 text-xs uppercase tracking-widest">
                {c.us}
              </th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row) => (
              <tr key={row.topic}>
                <th
                  scope="row"
                  className="border-border-decorative border-t px-4 py-3 text-left font-semibold"
                >
                  {row.topic}
                </th>
                <td className="border-border-decorative border-t px-4 py-3 text-text-secondary">
                  {row.them}
                </td>
                <td className="border-border-decorative border-t bg-teal-50 px-4 py-3 font-medium">
                  {row.us}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
