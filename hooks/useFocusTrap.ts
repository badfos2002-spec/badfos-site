import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * Accessible modal-dialog behaviour, dependency-free (no Radix):
 * - Escape closes the dialog
 * - focus moves into the dialog when it opens
 * - focus returns to the previously focused trigger when it closes
 * - Tab is trapped inside the dialog and wraps at both ends
 *
 * Attach `containerRef` to the dialog root and pass `isOpen` + `onClose`.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isOpen: boolean,
  onClose: () => void
) {
  // Keep the latest onClose without re-running the effect (which would steal focus)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null)

    // Move focus into the dialog (first focusable, else the container itself)
    const initial = getFocusable()[0] ?? container
    initial.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Return focus to the trigger on close
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [isOpen, containerRef])
}
