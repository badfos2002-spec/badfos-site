'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil, Share2, Loader2, Check } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import type { CartItem as CartItemType, DesignArea } from '@/lib/types'
import { formatPrice } from '@/lib/pricing'
import { tshirtMockups, tshirtMockupsBack, colorFallback, DESIGN_AREA_OVERLAYS } from '@/lib/mockup-data'
import { createSharedDesign } from '@/lib/db'

interface CartItemProps {
  item: CartItemType
}

function MockupView({ view, color, designs }: {
  view: 'front' | 'back'
  color: string
  designs: DesignArea[]
}) {
  const resolvedColor = colorFallback[color] || color
  const mockupSrc = view === 'front'
    ? (tshirtMockups[resolvedColor] || tshirtMockups['black'])
    : (tshirtMockupsBack[resolvedColor] || tshirtMockupsBack['black'])

  const viewDesigns = designs.filter(d => {
    const overlay = DESIGN_AREA_OVERLAYS[d.area]
    return overlay && overlay.view === view
  })

  return (
    <div className="relative w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mockupSrc}
        alt={view === 'front' ? 'קדימה' : 'אחורה'}
        className="w-full h-full object-contain"
      />
      {viewDesigns.map((design) => {
        const overlay = DESIGN_AREA_OVERLAYS[design.area]
        if (!overlay) return null
        return (
          <div
            key={design.area}
            className="absolute overflow-hidden"
            style={{ ...overlay.style, position: 'absolute' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={design.imageUrl}
              alt={design.areaName}
              className="w-full h-full object-contain"
            />
          </div>
        )
      })}
    </div>
  )
}

/** Convert blob URL to base64.
 *  PNG → FileReader (no canvas – guaranteed transparency preservation).
 *  JPEG/JPG → canvas resize + JPEG compression (background stays as uploaded). */
async function blobToBase64(blobUrl: string): Promise<string> {
  if (!blobUrl.startsWith('blob:')) return blobUrl
  const response = await fetch(blobUrl)
  const blob = await response.blob()
  const isPng = blob.type === 'image/png'

  if (isPng) {
    // Read PNG directly without canvas to guarantee transparency is preserved
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // JPEG: resize via canvas for compression
  const img = new Image()
  img.src = blobUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Image load failed'))
  })
  const MAX = 800
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

export default function CartItem({ item }: CartItemProps) {
  const router = useRouter()
  const removeItem = useCart((state) => state.removeItem)
  const setEditingItem = useCart((state) => state.setEditingItem)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleEdit = () => {
    setEditingItem(item.id)
    router.push(`/designer/${item.productType}`)
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      // Convert blob URLs to base64
      const designs = await Promise.all(
        item.designs.map(async (d) => ({
          area: d.area,
          areaName: d.areaName,
          imageBase64: await blobToBase64(d.imageUrl),
        }))
      )

      // Save to Firestore
      const shareId = await createSharedDesign({
        productType: item.productType,
        color: item.color,
        fabricType: item.fabricType,
        designs,
      })

      const shareUrl = `${window.location.origin}/share/${shareId}`
      const shareText = `ראו את העיצוב שיצרתי ב-בדפוס! 👕\n${shareUrl}`

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (isMobile && navigator.share) {
        // Native share on mobile
        await navigator.share({ title: 'העיצוב שלי - בדפוס', text: shareText, url: shareUrl })
      } else {
        // Desktop: copy link to clipboard + open in new tab after 2s
        try {
          await navigator.clipboard.writeText(shareUrl)
        } catch {
          const ta = document.createElement('textarea')
          ta.value = shareUrl
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        setShowToast(true)
        setTimeout(() => setShowToast(false), 2000)
        setTimeout(() => window.open(shareUrl, '_blank'), 2000)
      }

      setShared(true)
      setTimeout(() => setShared(false), 3000)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Share failed:', err)
      alert('שגיאה בשיתוף: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSharing(false)
    }
  }

  // Check which views have designs
  const hasFrontDesigns = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'front')
  const hasBackDesigns = item.designs.some(d => DESIGN_AREA_OVERLAYS[d.area]?.view === 'back')

  return (
    <Card className="relative">
      {/* Copy toast */}
      {showToast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap animate-fade-in-out">
          הקישור לעיצוב הועתק ✓
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Mockup Previews */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {item.specialProductName && item.designs[0]?.imageUrl ? (
              <div className="relative w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.designs[0].imageUrl} alt={item.specialProductName} className="w-full h-full object-contain" />
              </div>
            ) : item.designs.length > 0 ? (
              <>
                {hasFrontDesigns && (
                  <MockupView view="front" color={item.color} designs={item.designs} />
                )}
                {hasBackDesigns && (
                  <MockupView view="back" color={item.color} designs={item.designs} />
                )}
                {!hasFrontDesigns && !hasBackDesigns && (
                  <MockupView view="front" color={item.color} designs={[]} />
                )}
              </>
            ) : (
              <MockupView view="front" color={item.color} designs={[]} />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-lg">
                  {item.specialProductName || {
                    tshirt: 'חולצה בעיצוב אישי',
                    sweatshirt: 'סווטשירט בעיצוב אישי',
                    buff: 'באף בעיצוב אישי',
                    cap: 'כובע בעיצוב אישי',
                    apron: 'סינר בעיצוב אישי',
                  }[item.productType] || item.productType}
                </h3>
                <p className="text-sm text-text-gray">
                  {item.fabricType} • {item.color}
                </p>
              </div>
              <div className="flex gap-1">
                {!item.specialProductName && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEdit}
                    className="text-gray-500 hover:text-yellow-600 hover:bg-yellow-50"
                    title="ערוך פריט"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Design Areas */}
            {item.designs.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium">עיצובים:</p>
                <p className="text-sm text-text-gray">
                  {item.designs.map(d => d.areaName).join(', ')}
                </p>
              </div>
            )}

            {/* Sizes & Quantities + Share */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium mb-1">מידות וכמויות:</p>
                <div className="flex flex-wrap gap-2">
                  {item.sizes.map((size) => (
                    <span key={size.size} className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {size.size}: {size.quantity}
                    </span>
                  ))}
                </div>
              </div>
              {item.designs.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleShare}
                  disabled={sharing}
                  className={`gap-1.5 text-sm font-medium text-white shrink-0 shadow-md ${shared ? 'bg-green-400 hover:bg-green-400' : 'hover:opacity-90'}`}
                  style={shared ? {} : { backgroundColor: 'rgb(255, 195, 46)' }}
                >
                  {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : shared ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                  {sharing ? 'מכין...' : shared ? 'נשלח!' : 'שתף'}
                </Button>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm text-text-gray">
                {formatPrice(item.pricePerUnit)} × {item.totalQuantity}
              </span>
              <span className="text-xl font-bold text-black">
                {formatPrice(item.totalPrice)}
              </span>
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  )
}
