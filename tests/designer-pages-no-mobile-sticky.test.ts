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
