// Regex gates from spec/19 §1 and §2 and spec/09 §6. Run by `pnpm check`.
// Each gate is a rule a type checker cannot see. A failure prints file:line.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'out',
  'test-results',
  'playwright-report',
  'fonts',
  'coverage',
])
const CODE = /\.(ts|tsx|js|mjs|cjs|css|json)$/
const SELF = 'scripts/check-gates.ts'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return SKIP_DIRS.has(name) ? [] : walk(full)
    return [full]
  })
}

const files = ['apps', 'packages', 'scripts']
  .flatMap((d) => walk(join(ROOT, d)))
  .map((f) => relative(ROOT, f).split(sep).join('/'))
  .filter((f) => f !== SELF)

const isTest = (f: string) => /\.test\.tsx?$/.test(f) || f.includes('/test/e2e/')
const violations: string[] = []

function scan(name: string, pick: (f: string) => boolean, pattern: RegExp, why: string) {
  for (const file of files.filter(pick)) {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (pattern.test(line))
        violations.push(`${file}:${i + 1}  [${name}] ${why}\n    ${line.trim()}`)
    })
  }
}

// 1. No hex colour outside packages/ui-tokens (spec/19 §2, CLAUDE.md).
scan(
  'hex',
  (f) => CODE.test(f) && !f.startsWith('packages/ui-tokens/'),
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/,
  'hex colours live only in packages/ui-tokens',
)

// 2. No toFixed outside lib/format.ts (spec/19 §2).
scan(
  'toFixed',
  (f) => /\.(ts|tsx|js|mjs)$/.test(f) && f !== 'apps/web/lib/format.ts',
  /\.toFixed\(/,
  'format numbers through lib/format.ts',
)

// 3. Fixtures are deterministic: no Math.random, no faker (spec/19 §1).
scan(
  'random',
  (f) => f.startsWith('packages/data/') && !isTest(f),
  /Math\.random\(|faker/i,
  'fixtures must be identical on every run',
)

// 4. No clock reads without MOCK_TODAY (spec/19 §1 point 3).
scan(
  'clock',
  (f) =>
    /\.(ts|tsx)$/.test(f) &&
    !isTest(f) &&
    (f.startsWith('apps/web/') || f.startsWith('packages/data/') || f.startsWith('packages/core/')),
  /new Date\(\s*\)|Date\.now\(\)/,
  'read today from getRepositories().today() (MOCK_TODAY)',
)

// 5. DATA_SOURCE=mock is the only value in this phase (spec/19 §1).
scan(
  'data-source',
  (f) => !isTest(f) && (CODE.test(f) || f.endsWith('.env.example')),
  /DATA_SOURCE\s*[:=]\s*['"]?(?!mock\b)[A-Za-z]/,
  'mock is the only data source until step 4',
)

// 6. No user-visible English written in a component (spec/19 §2, spec/09 §6).
const jsxText = />([^<>{}=;()&|`$]*[A-Za-z]{2,}[^<>{}=;()&|`$]*)</
const jsxAttr =
  /\b(aria-label|aria-description|title|placeholder|alt|label)=["'][^"']*[A-Za-z][^"']*["']/
scan(
  'jsx-text',
  (f) => f.startsWith('apps/') && f.endsWith('.tsx') && !isTest(f),
  jsxText,
  'text comes from packages/copy',
)
scan(
  'jsx-attr',
  (f) => f.startsWith('apps/') && f.endsWith('.tsx') && !isTest(f),
  jsxAttr,
  'labels come from packages/copy',
)

// 7. Never a full SSN, in code or fixtures (CLAUDE.md).
scan('ssn', (f) => CODE.test(f), /\b\d{3}-\d{2}-\d{4}\b/, 'only ssn_last4 may exist')

// 8. No dangerouslySetInnerHTML (CLAUDE.md, spec/11 §6).
scan('html', (f) => /\.(ts|tsx)$/.test(f), /dangerouslySetInnerHTML/, 'React escaping only')

// 9. The only CSS files (spec/19 §2).
const allowedCss =
  /^(apps\/(web|site)\/app\/globals\.css|apps\/web\/features\/grid\/grid\.css|packages\/ui-tokens\/src\/[a-z-]+\.css)$/
for (const f of files.filter((x) => x.endsWith('.css') && !allowedCss.test(x))) {
  violations.push(`${f}  [css] only globals.css, features/grid/grid.css and ui-tokens may hold CSS`)
}

if (violations.length > 0) {
  console.error(`${violations.length} gate violation(s):\n\n${violations.join('\n')}`)
  process.exit(1)
}
console.log(`Gates passed (${files.length} files checked).`)
