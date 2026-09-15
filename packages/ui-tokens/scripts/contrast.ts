// Contrast check for every colour pair spec/14 §3 relies on.
// Reads the hex values from src/tokens.css, so the CSS stays the only source.
// Run: pnpm tokens:contrast   (exits 1 if a pair falls below its threshold)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const TEXT = 4.5 // WCAG 1.4.3
export const NON_TEXT = 3 // WCAG 1.4.11

type Pair = {
  fg: string
  bg: string
  min: number
  /** Ratio printed in spec/14 §3, if the spec states one. */
  documented?: number
  note: string
}

/** Pairs that must pass. `documented` is the number written in spec/14 §3. */
export const PAIRS: Pair[] = [
  { fg: 'teal-600', bg: 'surface', min: TEXT, documented: 6.38, note: 'brand text on white' },
  { fg: 'teal-700', bg: 'surface', min: TEXT, documented: 8.58, note: 'brand hover text on white' },
  { fg: 'surface', bg: 'teal-600', min: TEXT, documented: 6.38, note: 'primary button label' },
  { fg: 'surface', bg: 'teal-700', min: TEXT, documented: 8.58, note: 'primary button hover' },

  { fg: 'n-900', bg: 'surface', min: TEXT, documented: 18.04, note: 'primary text' },
  { fg: 'n-900', bg: 'n-50', min: TEXT, documented: 17.08, note: 'primary text on sunken' },
  { fg: 'n-600', bg: 'surface', min: TEXT, documented: 7.05, note: 'secondary text' },
  { fg: 'n-600', bg: 'n-50', min: TEXT, documented: 6.68, note: 'secondary on sunken' },
  {
    fg: 'n-600',
    bg: 'n-100',
    min: TEXT,
    documented: 6.22,
    note: 'secondary on header, Draft badge',
  },
  { fg: 'n-600', bg: 'error-50', min: TEXT, documented: 6.49, note: 'secondary on error row' },
  { fg: 'n-600', bg: 'warning-50', min: TEXT, documented: 6.76, note: 'secondary on warning row' },

  { fg: 'error-600', bg: 'surface', min: TEXT, documented: 6.57, note: 'error text' },
  { fg: 'error-600', bg: 'error-50', min: TEXT, documented: 6.05, note: 'error text on tone' },
  { fg: 'error-600', bg: 'error-100', min: TEXT, documented: 5.45, note: 'error text on tone' },
  { fg: 'warning-600', bg: 'surface', min: TEXT, documented: 5.43, note: 'warning text' },
  { fg: 'warning-600', bg: 'warning-50', min: TEXT, documented: 5.2, note: 'warning text on tone' },
  { fg: 'warning-600', bg: 'warning-100', min: TEXT, documented: 4.78, note: 'warning on tone' },
  { fg: 'success-600', bg: 'surface', min: TEXT, documented: 5.69, note: 'success text' },
  { fg: 'success-600', bg: 'success-50', min: TEXT, documented: 5.4, note: 'success on tone' },
  { fg: 'success-600', bg: 'success-100', min: TEXT, documented: 5.0, note: 'success on tone' },
  { fg: 'info-600', bg: 'surface', min: TEXT, documented: 5.99, note: 'info text' },
  { fg: 'info-600', bg: 'info-50', min: TEXT, documented: 5.5, note: 'info text on tone' },
  { fg: 'info-600', bg: 'info-100', min: TEXT, documented: 4.91, note: 'info text on tone' },
  { fg: 'violet-600', bg: 'surface', min: TEXT, documented: 7.49, note: 'Corrected text' },
  { fg: 'violet-600', bg: 'violet-50', min: TEXT, documented: 6.72, note: 'Corrected badge' },
  { fg: 'violet-600', bg: 'n-50', min: TEXT, documented: 7.1, note: 'Corrected on sunken' },

  { fg: 'error-500', bg: 'surface', min: NON_TEXT, documented: 4.83, note: 'error icon, border' },
  { fg: 'error-500', bg: 'error-50', min: NON_TEXT, documented: 4.44, note: 'error icon on tone' },
  { fg: 'warning-500', bg: 'surface', min: NON_TEXT, documented: 3.49, note: 'warning icon' },
  { fg: 'warning-500', bg: 'warning-50', min: NON_TEXT, documented: 3.34, note: 'warning on tone' },
  { fg: 'success-500', bg: 'surface', min: NON_TEXT, documented: 3.91, note: 'success icon' },
  { fg: 'success-500', bg: 'success-50', min: NON_TEXT, documented: 3.7, note: 'success on tone' },
  { fg: 'info-500', bg: 'surface', min: NON_TEXT, documented: 4.57, note: 'info icon' },
  { fg: 'info-500', bg: 'info-50', min: NON_TEXT, documented: 4.2, note: 'info icon on tone' },
  { fg: 'violet-500', bg: 'surface', min: NON_TEXT, documented: 4.82, note: 'violet icon' },
  { fg: 'violet-500', bg: 'violet-50', min: NON_TEXT, documented: 4.45, note: 'violet on tone' },

  { fg: 'n-450', bg: 'surface', min: NON_TEXT, documented: 3.64, note: 'input border' },
  { fg: 'n-450', bg: 'n-50', min: NON_TEXT, documented: 3.44, note: 'input border on sunken' },
  { fg: 'n-450', bg: 'n-100', min: NON_TEXT, documented: 3.21, note: 'input border on header' },

  { fg: 'teal-500', bg: 'surface', min: NON_TEXT, documented: 4.56, note: 'focus ring on white' },
  { fg: 'teal-500', bg: 'n-50', min: NON_TEXT, documented: 4.32, note: 'focus ring on sunken' },
  { fg: 'teal-500', bg: 'n-100', min: NON_TEXT, documented: 4.02, note: 'focus ring on header' },
  { fg: 'teal-500', bg: 'error-50', min: NON_TEXT, documented: 4.19, note: 'focus ring on error' },
  { fg: 'surface', bg: 'teal-600', min: NON_TEXT, documented: 6.38, note: 'inner ring on button' },

  { fg: 'surface', bg: 'n-900', min: TEXT, documented: 18.04, note: 'sidebar label' },
  { fg: 'n-300', bg: 'n-900', min: TEXT, documented: 11.45, note: 'sidebar inactive item' },
  { fg: 'teal-300', bg: 'n-900', min: NON_TEXT, documented: 8.09, note: 'sidebar active marker' },
  { fg: 'teal-300', bg: 'teal-800', min: NON_TEXT, documented: 4.89, note: 'marker on teal bar' },

  // Pairs the app shell uses that §3 does not print a number for.
  { fg: 'n-400', bg: 'n-900', min: TEXT, note: 'sidebar secondary text' },
  { fg: 'surface', bg: 'error-600', min: TEXT, note: 'count pill in sidebar' },
  { fg: 'surface', bg: 'success-600', min: TEXT, note: 'Submitted badge' },
]

/** Pairs spec/14 §3 documents as failing. They must keep failing, or the rule is stale. */
export const MUST_FAIL: Pair[] = [
  { fg: 'n-500', bg: 'n-50', min: TEXT, documented: 4.28, note: 'why n-500 is not text' },
  { fg: 'n-500', bg: 'n-100', min: TEXT, documented: 3.98, note: 'why n-500 is not text' },
  { fg: 'n-500', bg: 'error-50', min: TEXT, documented: 4.15, note: 'why n-500 is not text' },
  { fg: 'n-500', bg: 'warning-50', min: TEXT, documented: 4.37, note: 'why n-500 is not text' },
  { fg: 'n-400', bg: 'surface', min: NON_TEXT, documented: 2.54, note: 'why n-450 exists' },
  { fg: 'teal-500', bg: 'teal-800', min: NON_TEXT, documented: 2.39, note: 'marker rule' },
  { fg: 'teal-500', bg: 'teal-600', min: NON_TEXT, documented: 1.4, note: 'why the ring is white' },
]

const tokensPath = fileURLToPath(new URL('../src/tokens.css', import.meta.url))

/** name -> #RRGGBB, with var() references resolved. */
export function readColorTokens(css = readFileSync(tokensPath, 'utf8')): Map<string, string> {
  const raw = new Map<string, string>()
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = m
    if (name && value) raw.set(name, value.trim())
  }
  const resolved = new Map<string, string>()
  const resolve = (name: string, seen: string[] = []): string | undefined => {
    const value = raw.get(name)
    if (!value || seen.includes(name)) return undefined
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase()
    const ref = value.match(/^var\(--([a-z0-9-]+)\)$/)
    return ref?.[1] ? resolve(ref[1], [...seen, name]) : undefined
  }
  for (const name of raw.keys()) {
    const hex = resolve(name)
    if (hex) resolved.set(name, hex)
  }
  return resolved
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const round2 = (x: number) => Math.round(x * 100) / 100

export type Result = Pair & { value: number; ok: boolean }

export function checkContrast(tokens = readColorTokens()): { pass: Result[]; mustFail: Result[] } {
  const measure = (p: Pair): number => {
    const fg = tokens.get(p.fg)
    const bg = tokens.get(p.bg)
    if (!fg || !bg) throw new Error(`Unknown token in pair ${p.fg} on ${p.bg}`)
    return round2(ratio(fg, bg))
  }
  return {
    pass: PAIRS.map((p) => {
      const value = measure(p)
      return { ...p, value, ok: value >= p.min }
    }),
    mustFail: MUST_FAIL.map((p) => {
      const value = measure(p)
      return { ...p, value, ok: value < p.min }
    }),
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { pass, mustFail } = checkContrast()
  const bad = [...pass, ...mustFail].filter((r) => !r.ok)
  for (const r of pass) {
    const doc = r.documented === undefined ? '' : ` (spec ${r.documented})`
    console.log(
      `${r.ok ? 'ok  ' : 'FAIL'} ${r.value}:1 >= ${r.min}  ${r.fg} on ${r.bg}${doc}  ${r.note}`,
    )
  }
  for (const r of mustFail) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.value}:1 <  ${r.min}  ${r.fg} on ${r.bg}  ${r.note}`)
  }
  if (bad.length > 0) {
    console.error(`${bad.length} pair(s) broke the rule.`)
    process.exit(1)
  }
  console.log(
    `All ${pass.length} pairs pass, all ${mustFail.length} documented failures still fail.`,
  )
}
