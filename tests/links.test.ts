import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { normalizePath } from '../src/lib/payload/mappers.ts'

/**
 * Guards against links that point at routes which do not exist.
 *
 * This is not hypothetical: the seeded CMS content and the hard-coded chrome between
 * them shipped sixteen dead links on the home page alone — `/stays`, `/tours/packages`
 * and `/tours/cycling` were routes that had been renamed, `/offers/<slug>` and
 * `/destinations/<slug>` were route families that were never built, and the Header
 * global's "Book Now" CTA pointed at `/booking`, which has no page because checkout
 * lives at `/booking/[type]`. Every one of them returned a 404 in production.
 *
 * The route table is derived from the filesystem rather than written down here, so it
 * cannot drift: delete a route and the links pointing at it start failing.
 */

let pass = 0,
  fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    pass++
    console.log(`  ok  ${name}`)
  } else {
    fail++
    console.log(`FAIL  ${name}${detail ? '\n      ' + detail : ''}`)
  }
}

// --- the routes that actually exist -------------------------------------------

const ROUTE_ROOT = join('src', 'app', '(frontend)', '[locale]')

const collectRoutes = (dir: string, prefix = ''): string[] => {
  const routes: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (!statSync(full).isDirectory()) {
      if (entry === 'page.tsx') routes.push(prefix || '/')
      continue
    }
    // Route groups like (frontend) do not appear in the URL.
    const segment = entry.startsWith('(') ? '' : `/${entry}`
    routes.push(...collectRoutes(full, prefix + segment))
  }
  return routes
}

const routes = collectRoutes(ROUTE_ROOT)

/** A path resolves if some route matches it, treating [slug]/[type] as a wildcard. */
const resolves = (path: string): boolean => {
  const wanted = (path.split('?')[0] || '/').replace(/\/$/, '') || '/'
  return routes.some((route) => {
    const a = route.split('/').filter(Boolean)
    const b = wanted.split('/').filter(Boolean)
    if (a.length !== b.length) return false
    return a.every((seg, i) => seg.startsWith('[') || seg === b[i])
  })
}

check('route table was discovered', routes.length > 5, `found ${routes.length}`)

// --- every legacy path the normalizer knows must land somewhere real ----------

const LEGACY = [
  '/tours/packages',
  '/stays',
  '/tours/cycling',
  '/tours/bicycles',
  '/tours',
  '/destinations',
  '/booking',
  '/offers',
  '/offers/pharaohs-private-voyage',
  '/offers/sahara-twilight-retreat',
  '/offers/eternal-luxor-sunrise',
]

for (const legacy of LEGACY) {
  check(
    `"${legacy}" is remapped to a real route`,
    resolves(normalizePath(legacy, '/')),
    `normalizePath returned "${normalizePath(legacy, '/')}", which matches no page.tsx`,
  )
}

// A path that is already valid must pass through untouched.
for (const good of ['/tours/daily', '/hotels', '/bicycles', '/transfers/airport']) {
  check(`"${good}" is left alone`, normalizePath(good, '/') === good)
}

// --- hard-coded hrefs in the chrome must resolve too --------------------------

const CHROME_FILES = [
  join('src', 'lib', 'nav-defaults.ts'),
  join('src', 'components', 'layout', 'Footer.tsx'),
  join('src', 'components', 'sections', 'FeaturedDestinations.tsx'),
  join('src', 'components', 'sections', 'Journal.tsx'),
]

/**
 * Links we know are dead and have deliberately not fixed yet.
 *
 * The blog is planned but unbuilt, so the Journal section on the home page still
 * points at routes that do not exist. Listing them here keeps the suite honest —
 * green because the gap is acknowledged, not because it is invisible — and the
 * assertion is inverted: once `/journal` ships, these start failing and the entry has
 * to be deleted. An allowlist that cannot go stale.
 */
const KNOWN_MISSING = new Set(['/journal', '/journal/x'])

for (const file of CHROME_FILES) {
  const source = readFileSync(file, 'utf8')
  // Literal string hrefs only; template literals with a slug are covered by the
  // wildcard match above when their base path is literal.
  const hrefs = [...source.matchAll(/href[=:]\s*[{]?['"`](\/[a-zA-Z0-9/_?=$&{}.-]*)['"`]/g)].map(
    (m) => m[1].replace(/\$\{[^}]+\}/g, 'x'),
  )

  for (const href of new Set(hrefs)) {
    if (KNOWN_MISSING.has(href)) {
      check(
        `${file}: "${href}" is still a known gap`,
        !resolves(href),
        'This route now exists — delete it from KNOWN_MISSING in tests/links.test.ts.',
      )
      continue
    }
    check(`${file}: "${href}" resolves`, resolves(href))
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
