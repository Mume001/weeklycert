// Artificial latency of 120 to 250 ms so loading states are really seen and
// tested (spec/19 §3). Deterministic per call name: no Math.random.
// MOCK_DELAY_MS=0 turns it off (unit tests).

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

export function delayFor(label: string): number {
  const fixed = process.env.MOCK_DELAY_MS
  if (fixed !== undefined && fixed !== '') return Number(fixed)
  return 120 + (hash(label) % 131)
}

export function delay(label: string): Promise<void> {
  const ms = delayFor(label)
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}
