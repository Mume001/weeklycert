import { copy } from '@wc/copy'

/**
 * spec/16 §4 row 3: four hard numbers, before anyone scrolls. Every one is a
 * property of the product and none of them is a claim about customers, reviews
 * or logos, which 16 §6 and 19 §8 forbid until they are true.
 */
export function ProofRow() {
  return (
    <div className="bg-n-900 px-6 py-7 text-white">
      <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-6 text-center md:grid-cols-4">
        {copy.site.numbers.map((item) => (
          <div key={item.value}>
            <p className="font-semibold text-2xl tracking-tight">{item.value}</p>
            <p className="mt-1 text-n-400 text-sm">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
