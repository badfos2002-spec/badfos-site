import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// TICKET-023 — THE INVARIANT. A `loading.tsx` turns its segment's children into
// an implicit <Suspense>. A dynamically rendered page below such a boundary is
// no longer part of the React shell: Next finishes the shell (layout + the
// spinner fallback), flushes it and writes HTTP 200 to the socket, and only
// afterwards does the page's notFound() throw arrive inside the boundary. Next
// sets the 404 only in the catch around the SHELL render
// (next/dist/server/app-render/app-render.js — `if (isNotFoundError(err))
// res.statusCode = 404`), which a throw inside a Suspense boundary never
// reaches. Result: /deals/<unknown-slug> answered 200 with the not-found page —
// a soft 404, which Google indexes. It is silent, because the not-found UI still
// renders correctly and only the status code is wrong.
//
// `app/loading.tsx` was therefore removed and re-added, byte-identical, at
// app/designer/ and app/cart/ — the heavy mobile routes where the navigation
// spinner earns its keep and which have no notFound() descendant.
//
// So: no loading file may sit in a directory that is an ancestor of (or the same
// directory as) a route that calls notFound(). This test derives both sides from
// disk instead of hard-coding paths, so a notFound() added to a new route, or a
// loading.tsx added above one, fails the suite. Proof matrix and the probe
// results: .tickets/EXEC-023-rootcause.md
//
// If you need a loading fallback, put it on a leaf segment that never 404s.

const APP = join(__dirname, '..', 'app')
const LOADING_FILES = ['loading.tsx', 'loading.ts', 'loading.jsx', 'loading.js']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = walk(APP)
const rel = (f: string) => relative(APP, f).split(sep).join('/')

// Directories (relative to app/, '' = app/ itself) that hold a loading file.
const loadingDirs = files
  .filter((f) => LOADING_FILES.includes(rel(f).split('/').pop() as string))
  .map((f) => rel(f).split('/').slice(0, -1).join('/'))

// A route that 404s at runtime: it must both import `notFound` from
// next/navigation AND call it. Both halves are needed — app/share/[id] and
// app/share/cart/[id] keep a client `notFound` useState and would otherwise
// match on the name alone.
const notFoundRoutes = files
  .filter((f) => /\.(tsx|ts|jsx|js)$/.test(f))
  .filter((f) => {
    const src = readFileSync(f, 'utf8')
    return (
      /import\s*\{[^}]*\bnotFound\b[^}]*\}\s*from\s*['"]next\/navigation['"]/.test(src) &&
      /\bnotFound\(\)/.test(src)
    )
  })
  .map(rel)

/** app/, app/deals and app/deals/[slug] for 'deals/[slug]/page.tsx'. */
function ancestorDirsOf(routeFile: string): string[] {
  const parts = routeFile.split('/').slice(0, -1)
  return parts.map((_, i) => parts.slice(0, i + 1).join('/')).concat('')
}

describe('no Suspense boundary above a notFound() route (TICKET-023 soft 404)', () => {
  it('the walk really found the notFound() routes (a vacuous pass would hide everything)', () => {
    expect(notFoundRoutes).toContain('deals/[slug]/page.tsx')
    expect(notFoundRoutes).toContain('[slug]/page.tsx')
  })

  it('app/loading.tsx does not exist', () => {
    expect(existsSync(join(APP, 'loading.tsx'))).toBe(false)
  })

  it('no loading file is an ancestor-or-self of a notFound() route', () => {
    const violations: string[] = []
    for (const route of notFoundRoutes) {
      for (const dir of ancestorDirsOf(route)) {
        if (loadingDirs.includes(dir)) {
          violations.push(`app/${dir ? `${dir}/` : ''}loading.tsx is above app/${route}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})

// The spinner was relocated, not dropped: these two routes keep it.
describe('the loading spinner still exists where it matters', () => {
  afterEach(() => cleanup())

  // Static import paths: a template literal makes vite's dynamic-import-vars
  // plugin warn on every run.
  const SPINNERS = [
    ['designer', () => import('@/app/designer/loading')],
    ['cart', () => import('@/app/cart/loading')],
  ] as const

  for (const [segment, load] of SPINNERS) {
    it(`app/${segment}/loading.tsx renders the «טוען...» spinner`, async () => {
      const { default: Loading } = await load()
      render(<Loading />)
      expect(screen.getByText('טוען...')).toBeInTheDocument()
    })
  }
})
