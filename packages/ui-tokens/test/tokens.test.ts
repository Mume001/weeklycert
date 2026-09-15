import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const spec = read('../../../spec/14-DIZAJN-SISTEM.md')
const tokens = read('../src/tokens.css')
const theme = read('../src/theme.css')

const norm = (v: string) =>
  v
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ', ')
    .replace(/\(\s*/g, '(')
    .replace(/0\.(\d)/g, '.$1')
    .trim()
    .toLowerCase()

function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (m[1] && m[2]) out.set(m[1], norm(m[2]))
  }
  return out
}

/** Every `--name:value` inside the ```css blocks of spec/14. */
function specTokens(): Map<string, string> {
  const blocks = [...spec.matchAll(/```css\n([\s\S]*?)```/g)].map((m) => m[1] ?? '').join('\n')
  return declarations(blocks)
}

/** The --fs-* rows of the type table in spec/14 §4: name -> rem. */
function specTypeScale(): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of spec.matchAll(/\| `--(fs-[0-9a-z]+)` \| ([\d,]+) \| (\d+) \| (\d+) \|/g)) {
    if (m[1] && m[2]) out.set(m[1], `${m[2].replace(',', '.')}rem`)
  }
  return out
}

describe('ui-tokens copy spec/14 literally', () => {
  const mine = declarations(tokens)

  it('has every token from the css blocks of §3, §4 and §5 with the same value', () => {
    const expected = specTokens()
    expect(expected.size).toBeGreaterThan(70)
    const diff = [...expected]
      .filter(([name, value]) => mine.get(name) !== value)
      .map(([name, value]) => `--${name}: spec "${value}", tokens.css "${mine.get(name)}"`)
    expect(diff).toEqual([])
  })

  it('has the §4 type scale', () => {
    const scale = specTypeScale()
    expect(scale.size).toBe(10)
    for (const [name, rem] of scale) expect(norm(mine.get(name) ?? ''), name).toBe(norm(rem))
  })

  it('defines nothing the spec does not have', () => {
    const allowed = new Set([...specTokens().keys(), ...specTypeScale().keys()])
    expect([...mine.keys()].filter((n) => !allowed.has(n))).toEqual([])
  })

  it('theme.css repeats shared names with identical values', () => {
    const themed = declarations(theme)
    for (const name of [
      'font-sans',
      'font-mono',
      'radius-sm',
      'radius-md',
      'radius-lg',
      'shadow-sm',
      'shadow-md',
      'shadow-panel',
    ]) {
      expect(themed.get(name), name).toBe(mine.get(name))
    }
  })

  it('maps the type scale to Tailwind with the §4 line heights', () => {
    const themed = declarations(theme)
    for (const m of spec.matchAll(/\| `--fs-([0-9a-z]+)` \| ([\d,]+) \| (\d+) \| (\d+) \|/g)) {
      expect(themed.get(`text-${m[1]}`)).toBe(norm(`${m[2]?.replace(',', '.')}rem`))
      expect(themed.get(`text-${m[1]}--line-height`)).toBe(`${m[4]}px`)
    }
  })

  it('never loads weight 300', () => {
    const fonts = read('../src/fonts.css')
    const weights = new Set([...fonts.matchAll(/font-weight: (\d+)/g)].map((m) => m[1]))
    expect([...weights].sort()).toEqual(['400', '500', '600'])
  })
})
