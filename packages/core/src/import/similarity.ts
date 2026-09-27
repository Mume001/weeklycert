// "Trigram similarity ≥ 0.75 as a suggestion, never automatic" (spec/06 §3):
// a classification or job code nothing matched exactly is compared with the
// project's classifications, and the closest one is offered with how alike it
// is. The user confirms it or not; nothing here decides.

/** 06 §3: below this, no suggestion at all. 0.85 until 27.9.2026, when one wrong letter (0.82) fell under it. */
export const SUGGESTION_THRESHOLD = 0.75

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

/** The trigrams of a text, each word padded the way pg_trgm pads it ("  w", " wo", "wor", "ord", "rd "). */
export function trigrams(text: string): Set<string> {
  const out = new Set<string>()
  for (const word of words(text)) {
    const padded = `  ${word} `
    for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3))
  }
  return out
}

/** Shared trigrams over all trigrams of both, 0 to 1, as pg_trgm's similarity(). */
export function similarity(a: string, b: string): number {
  const x = trigrams(a)
  const y = trigrams(b)
  if (x.size === 0 || y.size === 0) return 0
  let shared = 0
  for (const t of x) if (y.has(t)) shared++
  return shared / (x.size + y.size - shared)
}

/**
 * The closest candidate at or above the threshold, with its score rounded to
 * two places, or null. Ties go to the first candidate, so the result is stable.
 */
export function suggest<T extends { labels: readonly string[] }>(
  text: string,
  candidates: readonly T[],
): { candidate: T; score: number } | null {
  let best: { candidate: T; score: number } | null = null
  for (const candidate of candidates) {
    const score = Math.max(0, ...candidate.labels.map((l) => similarity(text, l)))
    if (score >= SUGGESTION_THRESHOLD && (!best || score > best.score)) {
      best = { candidate, score }
    }
  }
  return best && { candidate: best.candidate, score: Math.floor(best.score * 100) / 100 }
}
