// What must NOT be on the public site, checked mechanically.
//
// spec/19 §8 lists four things that have to be gone before it is published, and
// three of them are the kind of mistake that survives a careful read: a Bosnian
// note left in a dashed box, an invented phone number, a claim about customers
// nobody made. The prototype in dizajn/sajt.html carried all three, on purpose,
// as notes to ourselves. This file is why they cannot reach the build.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { copy } from '@wc/copy'
import { describe, expect, it } from 'vitest'
import { generateStaticParams } from '@/app/legal/[doc]/page'
import { Hero } from '@/components/Hero'
import { LEGAL_DOCS } from '@/components/links'

/** Handed over by vitest.config.ts, which is the only place that knows it. */
const ROOT = process.env.SITE_ROOT ?? ''

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (['node_modules', '.next', 'out'].includes(name)) return []
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const sources = walk(join(ROOT, 'app'))
  .concat(walk(join(ROOT, 'components')))
  .filter((f) => /\.(ts|tsx|css)$/.test(f))
  .map((f) => ({ file: f.slice(ROOT.length), text: readFileSync(f, 'utf8') }))

/** Every string the site can show, flattened. */
function strings(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (Array.isArray(node)) return node.flatMap(strings)
  if (node && typeof node === 'object') return Object.values(node).flatMap(strings)
  return []
}
const siteText = strings(copy.site)

/**
 * Leftovers from the prototype, which can hide in a comment as easily as on the
 * page: the source counts as well as the text.
 */
function offenders(pattern: RegExp) {
  return [
    ...sources.filter((s) => pattern.test(s.text)).map((s) => s.file),
    ...siteText.filter((s) => pattern.test(s)),
  ]
}

/**
 * Claims, which only exist where a visitor can read them. A comment saying why
 * we refuse to claim something is not the claim, and an earlier version of this
 * file failed on its own explanation.
 */
function visible(pattern: RegExp) {
  return siteText.filter((s) => pattern.test(s))
}

describe('spec/19 §8: what has to be out before it is published', () => {
  it('carries no Bosnian note from the prototype', () => {
    // The letters no English marketing sentence contains.
    expect(offenders(/[čćžšđČĆŽŠĐ]/)).toEqual([])
    expect(offenders(/\b(Ovdje|ide|napomena|izmišljen\w*|prototip|sajta?)\b/i)).toEqual([])
  })

  it('carries no phone number, invented or otherwise', () => {
    // A phone number goes up when one exists that somebody answers (16 §4).
    expect(offenders(/\(\d{3}\)\s*\d{3}-\d{4}/)).toEqual([])
    expect(offenders(/tel:\+?\d/)).toEqual([])
  })

  it('carries no postal address', () => {
    expect(offenders(/\b(Casper|Wyoming)\b/)).toEqual([])
  })

  it('claims no customers, no reviews and no logos', () => {
    // 16 §4 row 11 keeps that section empty until real customers agree to be
    // quoted, so nothing on the page may stand in for them.
    expect(visible(/\b(testimonials?|trusted by|our customers say|G2|Capterra|BBB)\b/i)).toEqual([])
    // "join 200 contractors" and friends.
    expect(visible(/\bjoin \d|\b\d{2,}\+? (contractors|companies|customers)\b/i)).toEqual([])
  })

  it('claims no certification we do not hold', () => {
    // 16 §6 forbids a SOC 2 badge we do not have and phrases like "bank-level
    // encryption". Exactly one sentence names them, and it is the sentence that
    // refuses them: the rule is never claim, not never mention.
    const mentions = visible(/\bSOC ?2\b|bank-level|military-grade|AI-powered/i)
    expect(mentions).toHaveLength(1)
    for (const line of mentions) expect(line).toMatch(/We do not claim .* we do not say/)
  })

  it('uses no em or en dash in anything a visitor reads (15 §1 rule 7)', () => {
    expect(siteText.filter((s) => /[–—]/.test(s))).toEqual([])
  })
})

describe('the hero shows the real grid, and a whole week of it', () => {
  it('uses the screenshot the application regenerates, not a drawing', () => {
    render(<Hero />)
    const shot = screen.getByAltText(copy.site.hero.shotAlt)
    expect(shot.getAttribute('src')).toBe('/hero-grid.png')
  })

  it('describes seven days and never names them', () => {
    // The prototype drew Mon to Sat, six days. A week ending Saturday runs
    // Sunday to Saturday, seven days, and the end day is a company setting
    // (05 §4), so the alt text counts the days instead of naming them.
    expect(copy.site.hero.shotAlt).toMatch(/seven days/)
    expect(copy.site.hero.shotAlt).not.toMatch(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/)
  })
})

describe('the structure spec/16 asks for', () => {
  it('asks the eight questions of 16 §5, and only those', () => {
    expect(copy.site.faq.items).toHaveLength(8)
  })

  it('shows the four numbers of 16 §4 row 3', () => {
    expect(copy.site.numbers).toHaveLength(4)
  })

  it('compares seven rows, as 16 §4 row 8 asks', () => {
    expect(copy.site.compare.rows).toHaveLength(7)
  })

  it('builds three legal pages and no others (spec/19 §2)', () => {
    expect(generateStaticParams()).toEqual([{ doc: 'terms' }, { doc: 'privacy' }, { doc: 'dpa' }])
    expect(LEGAL_DOCS).toHaveLength(3)
  })

  it('writes no legal text of its own (spec/18 §5)', () => {
    // A generated Terms of Service on a compliance product is the risk the
    // product exists to remove. The page says so and offers the draft.
    expect(copy.site.legal.pending).toMatch(/prepared with counsel/)
  })
})
