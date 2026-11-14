import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// TICKET-010 changed app/globals.css from `overflow-x: hidden` to
// `overflow-x: clip` on body/main. `hidden` had made them scroll containers
// that never scroll, so EVERY `position: sticky` on the site silently did
// nothing. With the fix, sticky really sticks — including the full-height
// mobile preview blocks (`sticky top-0 …`) on these six designers, which would
// now pin a ~400 px preview at the top of the phone, under the (now sticky)
// site header. Only the t-shirt and sweatshirt designers have the compact
// preview that makes a sticky block usable; these pages keep their production
// behaviour (a preview that scrolls away) until they get it too.

const PAGES = ['apron', 'cap', 'buff', 'baby', 'tote', 'vest']

describe('designers without a compact preview have no mobile sticky block', () => {
  for (const name of PAGES) {
    it(`${name}: no "sticky top-0"`, () => {
      const src = readFileSync(join(__dirname, '..', 'app', 'designer', name, 'page.tsx'), 'utf8')
      expect(src).not.toContain('sticky top-0')
    })
  }
})

// TICKET-011: the t-shirt and sweatshirt designers dropped their compact sticky
// preview too (the user disliked it shrinking/growing while scrolling). Their
// MOBILE block is plain; only the desktop preview column stays sticky.
const COMPACT_GONE = [
  ['tshirt', join('components', 'designer', 'TshirtDesigner.tsx')],
  ['sweatshirt', join('app', 'designer', 'sweatshirt', 'page.tsx')],
]

describe('t-shirt and sweatshirt: no mobile sticky block, desktop column still sticky', () => {
  for (const [name, file] of COMPACT_GONE) {
    it(`${name}: no "sticky top-20"/"sticky top-0", no compact hook; "sticky top-24" stays`, () => {
      const src = readFileSync(join(__dirname, '..', file), 'utf8')
      const mobile = src.slice(src.indexOf('MOBILE LAYOUT'), src.indexOf('DESKTOP LAYOUT'))
      expect(mobile.length).toBeGreaterThan(0)
      expect(mobile).not.toContain('sticky top-20')
      expect(mobile).not.toContain('sticky top-0')
      expect(src).not.toContain('useCompactOnScroll')
      expect(src).toContain('sticky top-24')
    })
  }
})
