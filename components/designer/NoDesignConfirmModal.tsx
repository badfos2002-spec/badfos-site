'use client'

import { useEffect } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Styled in-site confirmation shown when the customer tries to leave the
 * design step without uploading anything — replaces the browser confirm().
 * Ordering a plain (unprinted) product is allowed, but must be intentional.
 */
export default function NoDesignConfirmModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-design-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 gradient-yellow rounded-full flex items-center justify-center mx-auto mb-4">
          <ImagePlus className="w-7 h-7 text-white" />
        </div>
        <h3 id="no-design-title" className="text-lg font-bold text-[#1e293b] mb-2">
          שים לב: לא העלית שום עיצוב 🎨
        </h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          אפשר להזמין את המוצר גם חלק, ללא הדפסה.
          <br />
          רוצה להמשיך לשלב הבא בלי עיצוב?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            חזרה לעיצוב
          </Button>
          <Button onClick={onConfirm} autoFocus className="flex-1 gradient-yellow text-white">
            המשך בלי עיצוב
          </Button>
        </div>
      </div>
    </div>
  )
}
