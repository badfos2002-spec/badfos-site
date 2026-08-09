import { useEffect, useState } from 'react'

/**
 * True on a touch-first pointer (phone/tablet). Feature query, not a UA sniff.
 *
 * Starts `false` and is filled in an effect: `window` does not exist while the
 * server renders, and a first render that differed from the server's would
 * hydrate-mismatch. The `change` listener matters in practice — a desktop
 * browser toggled into device emulation flips the query without a reload.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setCoarse(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return coarse
}
