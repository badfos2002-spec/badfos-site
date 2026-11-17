import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DESIGN_AREA_OVERLAYS, LONG_SLEEVE_AREA_OVERRIDES } from '@/lib/mockup-data'
import { TSHIRT_DESIGN_AREAS, getTshirtAreaIds } from '@/lib/constants'

// TICKET-018 (user: «בלי שרוולים רק כתפיים»): the long-sleeve tee offers
// exactly cotton's seven areas. Every one of them has a box in the shared map
// (view classification) and on the long-sleeve renders; no sleeve print area
// exists anywhere in the source.

const SEVEN = ['front_full', 'back', 'chest_logo', 'chest_logo_right', 'chest_logo_center', 'shoulder_right', 'shoulder_left']

describe('long-sleeve overlays — the seven areas', () => {
  it('long-sleeve offers exactly the seven cotton areas', () => {
    expect([...getTshirtAreaIds('long-sleeve')].sort()).toEqual([...SEVEN].sort())
    expect(TSHIRT_DESIGN_AREAS.map(a => a.id).sort()).toEqual([...SEVEN].sort())
  })

  it('each has a shared-map box and a long-sleeve render box', () => {
    for (const a of SEVEN) {
      expect(DESIGN_AREA_OVERLAYS[a], a).toBeDefined()
      expect(LONG_SLEEVE_AREA_OVERRIDES[a], a).toBeDefined()
    }
  })

  it('no sleeve box in either map', () => {
    for (const a of ['sleeve_right', 'sleeve_left']) {
      expect(DESIGN_AREA_OVERLAYS[a]).toBeUndefined()
      expect(LONG_SLEEVE_AREA_OVERRIDES[a]).toBeUndefined()
    }
  })
})

describe('guard — no sleeve print area anywhere in app/, components/, lib/', () => {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) files.push(p)
    }
  }
  for (const d of ['app', 'components', 'lib']) walk(join(process.cwd(), d))

  it('scans a real tree', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('no file mentions sleeve_right / sleeve_left / «שרוול ימין» / «שרוול שמאל»', () => {
    const hits = files.filter(f => /sleeve_right|sleeve_left|שרוול ימין|שרוול שמאל/.test(readFileSync(f, 'utf8')))
    expect(hits).toEqual([])
  })
})
