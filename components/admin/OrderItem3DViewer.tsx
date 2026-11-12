'use client'

/**
 * TICKET-006 — תצוגה תלת-ממדית חיה של פריט בהזמנה, בתוך כרטיס ההזמנה באדמין.
 *
 * אפס עלות אחסון: הבמה הקיימת (Preview3DStage), קבצי העיצוב ששמורים כבר על
 * ההזמנה, והמודלים שיושבים ב-public/models. שום קובץ לא מרונדר לאחסון ושום דבר
 * לא נכתב ל-Firestore — "שמור תמונה" יורדת למחשב/לטלפון של המנהל בלבד.
 *
 * הזוויות מגיעות מ-angleForArea (TICKET-004) דרך anglesForItem, הטקסטורות דרך
 * הפרוקסי same-origin (אחרת toBlob היה נכשל על קנבס מזוהם), והלכידה ממתינה
 * לפריים מרונדר ולא להשהיה.
 */

import { useMemo, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import Preview3DStage from '@/components/designer/three/Preview3DStage'
import ThreeErrorBoundary from '@/components/designer/three/ThreeErrorBoundary'
import type { ShirtVariant } from '@/components/designer/three/placements'
import { anglesForItem, snapshotFileName, viewerDesignsFor } from '@/lib/admin-3d-viewer'
import { captureStagePng, saveBlobAs } from '@/lib/order-snapshot'
import { getColorHex, getModel3D } from '@/lib/constants'
import type { OrderItem } from '@/lib/types'

interface OrderItem3DViewerProps {
  item: OrderItem
  orderNumber: number
  /** The item's index in the order — the file name shows it as index + 1. */
  index: number
}

export default function OrderItem3DViewer({ item, orderNumber, index }: OrderItem3DViewerProps) {
  const angles = useMemo(() => anglesForItem(item), [item])
  const designs = useMemo(() => viewerDesignsFor(item), [item])
  const model = getModel3D(item.productType, item.fabricType)

  const [selected, setSelected] = useState(0)
  const [focusAngle, setFocusAngle] = useState(angles[0].angle)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  /** Set only when both the download and the new tab were blocked. */
  const [manual, setManual] = useState<{ url: string; name: string } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const face = (i: number) => {
    setSelected(i)
    // A COTERMINAL angle when the pressed button is already the selected one:
    // same orientation, different number, so the stage sees a change and turns
    // back after the producer has spun the garment by hand.
    setFocusAngle(prev => (prev === angles[i].angle ? prev + Math.PI * 2 : angles[i].angle))
  }

  const save = async () => {
    setBusy(true)
    setError('')
    setManual(null)
    try {
      const blob = await captureStagePng(stageRef.current)
      if (!blob) {
        setError('שמירת התמונה נכשלה, נסו שוב')
        return
      }
      const name = snapshotFileName(orderNumber, index, angles[selected].label)
      const saved = saveBlobAs(blob, name)
      if (saved.outcome === 'blocked') setManual({ url: saved.url, name })
    } finally {
      setBusy(false)
    }
  }

  const angleBtn = 'min-h-[44px] min-w-[44px] shrink-0 rounded-lg border-2 px-3 text-sm font-semibold transition-colors'

  return (
    <ThreeErrorBoundary
      fallback={
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          התצוגה התלת-ממדית אינה נתמכת בדפדפן הזה
        </p>
      }
    >
      <div className="space-y-2">
        {/* Phone first: square and full width, so the garment and its buttons
            both fit above the fold. Desktop gets the wider frame. */}
        <div
          ref={stageRef}
          className="relative w-full aspect-square sm:aspect-[4/3] overflow-hidden rounded-xl border border-gray-200"
        >
          <Preview3DStage
            noHint
            colorHex={getColorHex(item.color, item.productType)}
            designs={designs}
            focusAngle={focusAngle}
            variant={model?.variant as ShirtVariant | undefined}
            modelUrl={model?.url}
          />
        </div>

        {/* One row directly under the canvas, thumb-reachable: it scrolls
            sideways on a narrow phone and wraps from `sm` up. The row may
            scroll — the page itself must not. */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible">
          {angles.map((a, i) => (
            <button
              key={a.area}
              type="button"
              aria-pressed={i === selected}
              onClick={() => face(i)}
              className={`${angleBtn} ${
                i === selected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-800 hover:border-blue-400'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Its own line, deliberately: at 390 px the four angles already fill
            the row above, and a save button inside it scrolls off the edge
            where nobody finds it. */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className={`${angleBtn} inline-flex items-center gap-1 border-gray-300 bg-white text-gray-800 hover:border-blue-400 disabled:opacity-60`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            שמור תמונה
          </button>
          <p className="text-xs text-gray-500">גררו לסיבוב חופשי, או בחרו זווית</p>
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
        {manual && (
          <a
            href={manual.url}
            download={manual.name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-blue-700 underline"
          >
            פתח את התמונה
          </a>
        )}
      </div>
    </ThreeErrorBoundary>
  )
}
