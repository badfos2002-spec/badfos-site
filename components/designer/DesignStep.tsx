'use client'

/**
 * Upload the customer's artwork the moment they pick it, and keep only the
 * resulting https Storage URL in the designer state.
 *
 * WHY THIS EXISTS
 * This step used to squeeze every design into a data: URL capped at 800,000
 * characters, because the cart is a Zustand store persisted to localStorage and
 * iOS Safari caps that at ~5MB. A measured 2,400,000-byte source came out the
 * other side as 47,798 bytes in Storage — ~50x destruction of the file the
 * owner physically prints from. Raising the cap only trades a quality bug for a
 * quota bug: full-resolution base64 in localStorage breaks the cart.
 *
 * So this designer now does what the other seven already do (app/designer/
 * sweatshirt, apron, tote, cap, buff, baby, vest): upload at selection time via
 * lib/print-image.ts + lib/storage.ts and carry a short https URL from here on.
 * The print master survives byte-for-byte; the cart holds a few hundred bytes.
 *
 * THE IN-FLIGHT WINDOW
 * The upload takes real seconds on mobile data, so the artwork goes onto the
 * mockup (and the 3D decal) immediately from a local blob: URL and is swapped
 * for the https one when the upload lands. A blob: URL dies with the tab, so it
 * must never reach the cart. Three things stop it: `onBusyChange` blocks the
 * step-3 Next button while an upload is in flight, TshirtDesigner refuses an
 * add-to-cart that still holds a blob:, and saveDesignerSession will not
 * persist one.
 *
 * OLD CARTS
 * Nothing here rewrites a cart that already holds data: designs. CartPage still
 * uploads those at checkout (preparePrintDataUrl) and /api/admin/download-design
 * still reads both shapes, so a cart persisted before this change checks out
 * exactly as it did.
 */

import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import { TSHIRT_DESIGN_AREAS, getDesignAreasByProductType, subscribePricing, getPricingVersion } from '@/lib/constants'
import type { DesignArea } from '@/lib/types'
import { confirmDesignReplace } from '@/lib/utils'
import { uploadDesignFile, generateUniqueFileName } from '@/lib/storage'
import { preparePrintFile, printUploadErrorMessage } from '@/lib/print-image'
import { failImageFit, imageFitInfo } from '@/lib/image-fit'
import { ImagePlus, CheckCircle, X } from 'lucide-react'

interface DesignStepProps {
  designs: DesignArea[]
  onUpdate: (designs: DesignArea[]) => void
  onAreaFocus?: (areaId: string) => void
  /** True while any area is preparing or uploading, so the parent can refuse to
   *  move on with a half-finished design. */
  onBusyChange?: (busy: boolean) => void
}

/**
 * How long an iPhone HEIC gets to become a JPEG before we give up on it.
 *
 * heic2any runs libheif in a worker it builds from a blob: URL, and a
 * Content-Security-Policy that does not allow blob: workers blocks that
 * *silently* — the promise simply never settles. Without a bound the customer
 * sits on a spinner forever and, because the design step refuses to advance
 * while an upload is in flight, cannot even carry on without the design.
 * Generous enough for a real conversion on a slow phone; finite either way.
 */
const HEIC_TIMEOUT_MS = 45000

/** Convert a HEIC/HEIF file to a JPEG File (iPhone photos that browsers can't decode) */
async function convertHeicToJpeg(file: File): Promise<File> {
  const convert = (async () => {
    const heic2any = (await import('heic2any')).default
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = (Array.isArray(out) ? out[0] : out) as Blob
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
  })()
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('heic conversion timed out')), HEIC_TIMEOUT_MS)
  )
  try {
    return await Promise.race([convert, timeout])
  } catch {
    // Same tagged reason a corrupt file gets: from the customer's side both mean
    // "we can't open this", and the Hebrew for it already says to re-save as
    // PNG/JPG (which is exactly how an iPhone gets out of HEIC).
    failImageFit('undecodable', file.name, file.size)
  }
}

/**
 * lib/print-image.ts passes anything under the Storage cap through WITHOUT
 * decoding it — exactly right for a print master, but it means a corrupt or
 * mis-named file would upload silently and the owner would open nothing on
 * print day. This step decoded every upload before, so keep that guarantee:
 * one decode to prove the file is really an image, then its untouched bytes.
 */
async function prepare(file: File): Promise<File> {
  try {
    (await createImageBitmap(file)).close()
  } catch {
    failImageFit('undecodable', file.name, file.size)
  }
  return preparePrintFile(file)
}

/**
 * The exact File that gets uploaded: an iPhone HEIC turned into JPEG first, then
 * lib/print-image.ts — which returns anything under the Storage cap
 * byte-identical and never reduces below print resolution.
 */
async function toPrintFile(file: File): Promise<File> {
  const looksHeic = /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  if (looksHeic) return prepare(await convertHeicToJpeg(file))
  try {
    return await prepare(file)
  } catch (err) {
    // Some HEIC files arrive with an empty or generic MIME type and miss the
    // test above; they land here as "not an image" / "can't decode".
    const reason = imageFitInfo(err).reason
    if (reason !== 'not_image' && reason !== 'undecodable') throw err
    // Only worth a HEIC attempt when the browser was never told what this is. A
    // file that declares image/png and still will not decode is simply broken;
    // handing that to heic2any leaves the customer on a spinner that never ends.
    if (/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type)) throw err
    try {
      return await prepare(await convertHeicToJpeg(file))
    } catch {
      // Not HEIC after all — rethrow the tagged original so the customer gets
      // the specific Hebrew message instead of heic2any's English.
      throw err
    }
  }
}

/** Let the browser fetch the uploaded file before the preview switches to it, so
 *  the mockup doesn't blink at the handover. Bounded — the swap is correct
 *  whether or not the warm-up finishes. */
function warmCache(url: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const img = new window.Image()
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    setTimeout(done, 5000)
    img.src = url
  })
}

export default function DesignStep({ designs, onUpdate, onAreaFocus, onBusyChange }: DesignStepProps) {
  // Live admin pricing for the +₪ labels
  useSyncExternalStore(subscribePricing, getPricingVersion, getPricingVersion)
  const liveAreas = getDesignAreasByProductType('tshirt')
  const livePrice = (id: string) => liveAreas.find(a => a.id === id)?.price ?? TSHIRT_DESIGN_AREAS.find(a => a.id === id)?.price ?? 0
  const [selectedAreaId, setSelectedAreaId] = useState<string>(TSHIRT_DESIGN_AREAS[0].id)
  const [busyAreas, setBusyAreas] = useState<string[]>([])
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const sessionId = useState(() => `tshirt-${Date.now()}`)[0]

  // `designs` is the parent's state, so the copy captured when an upload starts
  // is stale by the time it finishes — the customer can touch another area
  // meanwhile. Always merge into the latest array.
  const designsRef = useRef(designs)
  useEffect(() => { designsRef.current = designs }, [designs])

  // The blob: previews we created, so none is ever leaked.
  const previewUrls = useRef<string[]>([])

  // Revoke every preview `designs` no longer points at. Runs AFTER the commit
  // that swapped it out, so no <img> is left pointing at a dead URL.
  useEffect(() => {
    const live = new Set(designs.map(d => d.imageUrl))
    previewUrls.current = previewUrls.current.filter(url => {
      if (live.has(url)) return true
      URL.revokeObjectURL(url)
      return false
    })
  }, [designs])
  // On unmount, drop only what nothing points at. This step unmounts on every
  // step change, and an upload started here keeps running — revoking its preview
  // would blank the mockup until the https URL lands. The effect above already
  // frees each preview the instant it stops being referenced.
  useEffect(() => () => {
    const live = new Set(designsRef.current.map(d => d.imageUrl))
    previewUrls.current.forEach(url => { if (!live.has(url)) URL.revokeObjectURL(url) })
  }, [])

  const busy = busyAreas.length > 0
  useEffect(() => { onBusyChange?.(busy) }, [busy, onBusyChange])
  // An upload that outlives this step (the customer pressed "הקודם") must not
  // leave the parent blocked forever — the add-to-cart blob: guard covers it.
  useEffect(() => () => { onBusyChange?.(false) }, [onBusyChange])

  const selectedArea = TSHIRT_DESIGN_AREAS.find(a => a.id === selectedAreaId)!
  const getDesign = (areaId: string) => designs.find(d => d.area === areaId)
  const hasDesign = (areaId: string) => designs.some(d => d.area === areaId)
  const isBusy = (areaId: string) => busyAreas.includes(areaId)

  const handleAreaSelect = (areaId: string) => {
    setSelectedAreaId(areaId)
    onAreaFocus?.(areaId)
  }

  const putDesign = (design: DesignArea) => {
    const next = [...designsRef.current]
    const i = next.findIndex(d => d.area === design.area)
    if (i >= 0) next[i] = design
    else next.push(design)
    designsRef.current = next
    onUpdate(next)
  }

  const dropDesign = (areaId: string) => {
    const next = designsRef.current.filter(d => d.area !== areaId)
    designsRef.current = next
    onUpdate(next)
  }

  const handleFileSelectForArea = async (areaId: string, file: File) => {
    const area = TSHIRT_DESIGN_AREAS.find(a => a.id === areaId)!

    if (isBusy(areaId)) return

    // Never silently overwrite: if this area already holds a design in the current
    // session, require explicit confirmation. On cancel, keep the existing design.
    if (hasDesign(areaId) && !confirmDesignReplace(area.name, true)) return

    const previous = designsRef.current.find(d => d.area === areaId) ?? null
    setBusyAreas(prev => (prev.includes(areaId) ? prev : [...prev, areaId]))
    setSelectedAreaId(areaId)
    onAreaFocus?.(areaId)

    try {
      const ready = await toPrintFile(file)

      // Put the artwork on the garment straight away, from the local file: the
      // upload below takes real seconds on mobile data and the customer must
      // not be left staring at an empty mockup while it runs.
      const preview = URL.createObjectURL(ready)
      previewUrls.current.push(preview)
      const entry: DesignArea = {
        area: areaId as DesignArea['area'],
        areaName: area.name,
        imageUrl: preview,
        fileName: ready.name,
      }
      putDesign(entry)

      const permanentUrl = await uploadDesignFile(ready, sessionId, generateUniqueFileName(ready.name))
      await warmCache(permanentUrl)
      putDesign({ ...entry, imageUrl: permanentUrl })
    } catch (err) {
      console.error('Design upload failed:', err)
      // Never leave a blob: preview behind — it dies with the tab and the owner
      // would have nothing to print. Put back whatever was there before.
      if (previous) putDesign(previous)
      else dropDesign(areaId)
      alert(printUploadErrorMessage(err))
    } finally {
      setBusyAreas(prev => prev.filter(a => a !== areaId))
    }
  }

  const handleFileSelect = (file: File) => {
    handleFileSelectForArea(selectedAreaId, file)
  }

  const removeDesign = (areaId: string) => dropDesign(areaId)

  const currentDesign = getDesign(selectedAreaId)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">בחר אזור לעיצוב, ואז העלה את התמונה שלך.</p>
      <p className="text-xs text-gray-400 mb-4">רוצה כמה עיצובים שונים? העלו לאזור אחר, או סיימו והוסיפו לעגלה ואז התחילו פריט חדש.</p>

      {/* ── MOBILE: merged area + upload buttons ── */}
      <div className="lg:hidden grid gap-3 mb-4 grid-cols-2">
        {TSHIRT_DESIGN_AREAS.map((area) => {
          const uploaded = hasDesign(area.id)
          const processing = isBusy(area.id)
          return (
            <div key={area.id} className="relative">
              {processing && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 rounded-xl">
                  <span className="text-[11px] font-medium text-yellow-600">מעלה עיצוב…</span>
                </div>
              )}
              <label
                role="button"
                tabIndex={0}
                aria-label={`${uploaded ? 'החלפת' : 'העלאת'} עיצוב לאזור ${area.name}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click() } }}
                className={`cursor-pointer block border-2 border-dashed rounded-xl p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                  uploaded
                    ? 'border-green-400 bg-green-50'
                    : 'border-yellow-300 bg-white hover:border-yellow-400 hover:bg-yellow-50'
                }`}
                onClick={() => handleAreaSelect(area.id)}
              >
                {uploaded ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-green-700">{area.name}</p>
                    <p className="text-[10px] text-yellow-600 mt-1">לחץ להחלפה</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 gradient-yellow rounded-full flex items-center justify-center mx-auto mb-2">
                      <ImagePlus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-gray-900">{area.name}</p>
                    <p className="text-[10px] text-gray-500">+₪{livePrice(area.id)}</p>
                    <p className="text-[10px] text-yellow-600 mt-1">לחץ להעלאה</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/heic, image/heif, .heic, .heif"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[area.id] = el }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelectForArea(area.id, f); if (e.target) e.target.value = '' }}
                />
              </label>
              {uploaded && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeDesign(area.id) }}
                  aria-label={`הסרת עיצוב מאזור ${area.name}`}
                  className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP: original area selector + upload area ── */}
      <div className="hidden lg:block">
        {/* Area selector buttons */}
        <div className="grid gap-2 mb-4 grid-cols-2">
          {TSHIRT_DESIGN_AREAS.map((area) => {
            const isActive = selectedAreaId === area.id
            const uploaded = hasDesign(area.id)
            return (
              <button
                key={area.id}
                onClick={() => handleAreaSelect(area.id)}
                aria-pressed={isActive}
                className={`relative text-xs h-16 px-2 py-2 rounded-md border font-medium transition-all flex items-center justify-center ${
                  isActive
                    ? 'gradient-yellow text-white border-transparent shadow'
                    : 'bg-background shadow-sm border-yellow-200 hover:bg-yellow-50 hover:text-accent-foreground'
                }`}
              >
                {uploaded && !isActive && (
                  <span className="absolute top-1 right-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  </span>
                )}
                <div className="flex flex-col items-center">
                  <span>{area.name}</span>
                  {isBusy(area.id)
                    ? <span className="text-[10px] opacity-80">מעלה…</span>
                    : <span className="text-[10px] opacity-80">+₪{livePrice(area.id)}</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Upload area */}
        <div className="space-y-3">
          {isBusy(selectedAreaId) && (
            <div className="text-center text-xs font-medium text-yellow-600">מעלה עיצוב…</div>
          )}
          {currentDesign ? (
            <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm font-medium text-green-700 truncate max-w-[180px]">{currentDesign.fileName}</span>
                </div>
                <button onClick={() => removeDesign(selectedAreaId)} aria-label={`הסרת עיצוב מאזור ${selectedArea.name}`} className="text-red-400 hover:text-red-600 shrink-0 mr-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="w-full aspect-video bg-white rounded-lg overflow-hidden border border-green-200 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentDesign.imageUrl} alt="עיצוב" className="w-full h-full object-contain" />
              </div>
              <label
                role="button"
                tabIndex={0}
                aria-label={`החלפת עיצוב לאזור ${selectedArea.name}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click() } }}
                className="cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-lg"
              >
                <div className="w-full text-center py-2 px-3 border border-dashed border-yellow-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all text-xs text-gray-500 font-medium">
                  החלף קובץ
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/heic, image/heif, .heic, .heif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); if (e.target) e.target.value = '' }}
                />
              </label>
            </div>
          ) : (
            <label
              role="button"
              tabIndex={0}
              aria-label={`העלאת עיצוב לאזור ${selectedArea.name}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click() } }}
              className="cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-lg"
            >
              <div className="border-2 border-dashed border-yellow-300 rounded-lg p-6 text-center hover:border-yellow-400 hover:bg-yellow-50 transition-all mx-auto max-w-xs">
                <div className="w-12 h-12 gradient-yellow rounded-full flex items-center justify-center mx-auto mb-3">
                  <ImagePlus className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">לחץ להעלאת תמונה</p>
                <p className="text-xs text-gray-600 mb-2">JPG, PNG, JPEG עד 30MB</p>
                <p className="text-xs text-blue-600 font-medium">יועלה לאזור: {selectedArea.name}</p>
              </div>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/heic, image/heif, .heic, .heif"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); if (e.target) e.target.value = '' }}
              />
            </label>
          )}
        </div>
      </div>

      {designs.length === 0 && (
        <p role="alert" className="text-sm text-red-500 mt-4">יש להעלות לפחות קובץ אחד כדי להמשיך.</p>
      )}

      {/* Uploaded areas summary — desktop only (mobile shows inline) */}
      {designs.length > 0 && (
        <div className="mt-4 space-y-1 hidden lg:block">
          {designs.map(d => (
            <div key={d.area} className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="font-medium text-green-700">{d.areaName}</span>
                <span className="text-gray-400 truncate max-w-[100px]">{d.fileName}</span>
              </div>
              <button onClick={() => removeDesign(d.area)} aria-label={`הסרת עיצוב מאזור ${d.areaName}`} className="text-red-400 hover:text-red-600 mr-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
