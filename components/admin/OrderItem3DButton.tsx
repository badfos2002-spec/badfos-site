'use client'

/**
 * TICKET-006 — הכפתור בכרטיס הפריט ב-/admin/orders: "תצוגה תלת-ממדית".
 *
 * מוצג רק לפריטים שיש להם מודל תלת-ממד (חולצה/סווטשרט), והתצוגה עצמה נטענת
 * בעצלתיים כדי שחבילת עמוד ההזמנות לא תגדל עד שמנהל באמת מבקש תלת-ממד.
 */

import { useState } from 'react'
import nextDynamic from 'next/dynamic'
import { Box, X } from 'lucide-react'
import type { OrderItem } from '@/lib/types'

/** three + drei + טעינת ה-GLB נכנסים רק בלחיצה; ssr:false — זה WebGL. */
const OrderItem3DViewer = nextDynamic(() => import('@/components/admin/OrderItem3DViewer'), {
  ssr: false,
  loading: () => <p className="text-sm text-gray-500">טוען תצוגה תלת-ממדית…</p>,
})

/** The product types `getModel3D` has a shirt model for. */
const SUPPORTED: readonly string[] = ['tshirt', 'sweatshirt']

export default function OrderItem3DButton({
  item,
  orderNumber,
  index,
  className = '',
}: {
  item: OrderItem
  orderNumber: number
  index: number
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!SUPPORTED.includes(item.productType as string)) return null

  const btn = 'inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 text-sm font-semibold'
  return (
    // The item card sits inside a clickable order row — a press here must not
    // collapse the order underneath it (same guard as SketchLinkButton).
    <div className={`space-y-2 ${className}`} onClick={e => e.stopPropagation()}>
      {open ? (
        <>
          <OrderItem3DViewer item={item} orderNumber={orderNumber} index={index} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`${btn} border-gray-300 bg-white text-gray-700`}
          >
            <X className="h-4 w-4" /> סגירת התצוגה
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${btn} border-blue-600 bg-white text-blue-700 hover:bg-blue-50`}
        >
          <Box className="h-4 w-4" /> תצוגה תלת-ממדית
        </button>
      )}
    </div>
  )
}
