// Every route of spec/03 §2 exists (spec/20 O, 12 step 3 "Gotovo kad"): 57 of
// them, 50 screens and 7 API routes, in apps/web and apps/site. The list is
// read from 03 itself, so a route added there and not built fails here.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const spec03 = readFileSync(join(root, 'spec/03-RUTE-I-EKRANI.md'), 'utf8')

/** The routes in the code block of §2: every token that starts with a slash. */
function specRoutes(): string[] {
  const section = spec03.split('## 2. Mapa ruta')[1]?.split('\n## 3.')[0] ?? ''
  const block = section.split('```')[1] ?? ''
  return block.split('\n').flatMap((line) => {
    // A line holds the routes first, then a note after two or more spaces.
    const routes: string[] = []
    for (const token of line.trim().split(/\s+/)) {
      if (!token.startsWith('/')) break
      routes.push(token)
    }
    return routes
  })
}

/** Every page.tsx and route.ts of an app, as a route: route groups dropped. */
function builtRoutes(app: string): string[] {
  const base = join(root, 'apps', app, 'app')
  const out: string[] = []
  const walk = (dir: string, parts: string[]) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        walk(full, /^\(.*\)$/.test(name) ? parts : [...parts, name])
      } else if (name === 'page.tsx' || name === 'route.ts') {
        out.push(`/${parts.join('/')}`)
      }
    }
  }
  walk(base, [])
  return out
}

/** /legal/[doc] carries three routes: its static params (03 §2). */
const siteLegal = ['/legal/terms', '/legal/privacy', '/legal/dpa']

/** Same length, same literal segments; a [param] matches a [param] of any name. */
function matches(route: string, built: string): boolean {
  const a = route.split('/')
  const b = built.split('/')
  return (
    a.length === b.length &&
    a.every((seg, i) => {
      const other = b[i] ?? ''
      return seg === other || (seg.startsWith('[') && other.startsWith('['))
    })
  )
}

describe('spec/03 §2: all 57 routes exist', () => {
  const routes = specRoutes()
  const built = [
    ...builtRoutes('web'),
    ...builtRoutes('site').filter((r) => r !== '/legal/[doc]'),
    ...siteLegal,
  ]

  it('reads 57 routes from the spec, 7 of them API routes', () => {
    expect(routes).toHaveLength(57)
    expect(new Set(routes).size).toBe(57)
    expect(routes.filter((r) => r.startsWith('/api/'))).toHaveLength(7)
  })

  it('has a page or route handler for every one', () => {
    const missing = routes.filter((r) => !built.some((b) => matches(r, b)))
    expect(missing).toEqual([])
  })

  it('builds nothing the spec does not list', () => {
    const extra = built.filter((b) => !routes.some((r) => matches(r, b)))
    expect(extra).toEqual([])
  })

  it('the site generates exactly the three legal pages', () => {
    const page = readFileSync(join(root, 'apps/site/app/legal/[doc]/page.tsx'), 'utf8')
    expect(page).toContain('generateStaticParams')
    const links = readFileSync(join(root, 'apps/site/components/links.ts'), 'utf8')
    expect(links).toContain("export const LEGAL_DOCS = ['terms', 'privacy', 'dpa'] as const")
  })
})
