// The font files, against what spec/14 §4 says is loaded.
//
// This file exists because the mistake it catches is invisible on screen: a
// `@font-face` for weight 600 pointing at the 400 file still renders, because
// the browser fakes the weight. It looks nearly right in a heading and wrong in
// a column of numbers, and nothing in a type check, a lint rule or an axe run
// says a word about it. It was the state of this package until 16.9.2026.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const path = (rel: string) => fileURLToPath(new URL(rel, import.meta.url))
const read = (rel: string) => readFileSync(path(rel), 'utf8')

const spec = read('../../../spec/14-DIZAJN-SISTEM.md')
const css = read('../src/fonts.css')

/** "Učitavaju se samo debljine 400, 500 i 600." (spec/14 §4). */
function specWeights(): string[] {
  const sentence = /debljine ([\d, i]+)\./.exec(spec)?.[1]
  return [...(sentence ?? '').matchAll(/\d+/g)].map((m) => m[0])
}

/** The first quoted family of `--font-sans` and `--font-mono` in spec/14 §4. */
function specFamilies(): string[] {
  return ['--font-sans', '--font-mono'].map((token) => {
    const value = new RegExp(`${token}\\s*:\\s*'([^']+)'`).exec(spec)?.[1]
    if (!value) throw new Error(`spec/14 §4 has no ${token}`)
    return value
  })
}

interface Face {
  family: string
  weight: string
  display: string
  file: string
}

function faces(): Face[] {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body = '']) => ({
    family: /font-family:\s*'([^']+)'/.exec(body)?.[1] ?? '',
    weight: /font-weight:\s*(\d+)/.exec(body)?.[1] ?? '',
    display: /font-display:\s*(\w+)/.exec(body)?.[1] ?? '',
    file: /url\('\.\.\/fonts\/([^']+)'\)/.exec(body)?.[1] ?? '',
  }))
}

const all = faces()
const weights = specWeights()
const families = specFamilies()

describe('spec/14 §4: three weights, and each one is a font, not a guess', () => {
  it('reads the weights and the families out of the spec', () => {
    expect(weights).toEqual(['400', '500', '600'])
    expect(families).toEqual(['IBM Plex Sans', 'IBM Plex Mono'])
  })

  it('declares every family at every weight, and no weight the spec does not name', () => {
    for (const family of families) {
      const mine = all.filter((face) => face.family === family)
      expect([...new Set(mine.map((f) => f.weight))].sort(), family).toEqual(weights)
    }
    expect([...new Set(all.map((f) => f.family))].sort()).toEqual([...families].sort())
  })

  it('has a file on disk behind every declaration', () => {
    for (const face of all) {
      const file = path(`../fonts/${face.file}`)
      expect(existsSync(file), `${face.family} ${face.weight}: ${face.file}`).toBe(true)
      // A truncated download still parses as a path and serves as 0 bytes.
      expect(statSync(file).size, face.file).toBeGreaterThan(4000)
      // woff2 and not a renamed ttf or an error page saved as a font.
      expect(readFileSync(file).subarray(0, 4).toString(), face.file).toBe('wOF2')
    }
  })

  it('never lets two weights share a file, which is what faking a weight looks like', () => {
    for (const family of families) {
      const byWeight = new Map<string, Set<string>>()
      for (const face of all.filter((f) => f.family === family)) {
        byWeight.set(face.weight, (byWeight.get(face.weight) ?? new Set()).add(face.file))
      }
      const used = [...byWeight.values()].flatMap((files) => [...files])
      expect(new Set(used).size, `${family} reuses a file across weights`).toBe(used.length)
    }
  })

  it('swaps rather than hiding the text while a file is in flight (spec/19 §8)', () => {
    expect(all.filter((face) => face.display !== 'swap')).toEqual([])
  })

  it('ships no font the stylesheet does not use', () => {
    const onDisk = readdirSync(path('../fonts')).filter((name) => name.endsWith('.woff2'))
    const declared = new Set(all.map((face) => face.file))
    expect(onDisk.filter((name) => !declared.has(name))).toEqual([])
    expect(onDisk).toHaveLength(declared.size)
  })
})
