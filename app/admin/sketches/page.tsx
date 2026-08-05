'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImagePlus, X, Check, Loader2, Share2, Copy, ExternalLink, RefreshCw, Paintbrush, Eraser } from 'lucide-react'
import { uploadDesignFile, generateUniqueFileName } from '@/lib/storage'
import { createSharedDesign } from '@/lib/db'
import {
  FABRIC_TYPES, TSHIRT_COLORS, FABRIC_COLOR_FILTER, TSHIRT_DESIGN_AREAS,
  SWEATSHIRT_TYPES, SWEATSHIRT_COLORS, SWEATSHIRT_COLOR_FILTER, SWEATSHIRT_DESIGN_AREAS, SWEATSHIRT_AREA_FILTER,
  CAP_TYPES, CAP_COLORS, CAP_COLOR_FILTER, CAP_DESIGN_AREAS, CAP_AREA_FILTER,
  TOTE_TYPES, TOTE_COLORS, TOTE_COLOR_FILTER, TOTE_DESIGN_AREAS, TOTE_AREA_FILTER,
  BUFF_COLORS, BUFF_DESIGN_AREAS, APRON_COLORS, APRON_DESIGN_AREAS, BABY_COLORS, BABY_DESIGN_AREAS,
  getModel3D,
} from '@/lib/constants'
import nextDynamic from 'next/dynamic'
import ThreeErrorBoundary from '@/components/designer/three/ThreeErrorBoundary'
import Preview3DLoading from '@/components/designer/three/Preview3DLoading'

const Preview3DStage = nextDynamic(() => import('@/components/designer/three/Preview3DStage'), {
  ssr: false,
  loading: () => <Preview3DLoading />,
})

type ColorDef = { id: string; name: string; hex: string; border?: boolean }
type TypeDef = { id: string; name: string }
type AreaDef = { id: string; name: string }

interface ProductDef {
  id: string
  name: string
  types: readonly TypeDef[] | null
  colors: readonly ColorDef[]
  colorFilter?: Record<string, string[]>
  areas: readonly AreaDef[]
  areaFilter?: Record<string, string[]>
}

const PRODUCTS: ProductDef[] = [
  { id: 'tshirt', name: 'חולצה', types: FABRIC_TYPES, colors: TSHIRT_COLORS as unknown as ColorDef[], colorFilter: FABRIC_COLOR_FILTER, areas: TSHIRT_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'sweatshirt', name: 'סווטשירט', types: SWEATSHIRT_TYPES, colors: SWEATSHIRT_COLORS as unknown as ColorDef[], colorFilter: SWEATSHIRT_COLOR_FILTER, areas: SWEATSHIRT_DESIGN_AREAS as unknown as AreaDef[], areaFilter: SWEATSHIRT_AREA_FILTER },
  { id: 'cap', name: 'כובע', types: CAP_TYPES, colors: CAP_COLORS as unknown as ColorDef[], colorFilter: CAP_COLOR_FILTER, areas: CAP_DESIGN_AREAS as unknown as AreaDef[], areaFilter: CAP_AREA_FILTER },
  { id: 'tote', name: 'תיק', types: TOTE_TYPES, colors: TOTE_COLORS as unknown as ColorDef[], colorFilter: TOTE_COLOR_FILTER, areas: TOTE_DESIGN_AREAS as unknown as AreaDef[], areaFilter: TOTE_AREA_FILTER },
  { id: 'buff', name: 'באף', types: null, colors: BUFF_COLORS as unknown as ColorDef[], areas: BUFF_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'apron', name: 'סינר', types: null, colors: APRON_COLORS as unknown as ColorDef[], areas: APRON_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'baby', name: 'בגד גוף', types: null, colors: BABY_COLORS as unknown as ColorDef[], areas: BABY_DESIGN_AREAS as unknown as AreaDef[] },
]

/**
 * Client-side background removal for solid-background artwork (the typical
 * customer logo on white). Estimates the background colour from the image
 * border (mode of quantized border samples), then flood-fills from ALL border
 * pixels, clearing pixels within tolerance — so interior whites that are part
 * of the design are kept. Runs locally: free, instant, nothing leaves the browser.
 */
async function removeBackgroundFile(file: File): Promise<File> {
  const bmp = await createImageBitmap(file)
  const MAX = 3000
  const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(bmp, 0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data

  // Background estimate: most common quantized colour along the border.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4)
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]
    buckets.set(key, b)
  }
  for (let x = 0; x < w; x += 3) { sample(x, 0); sample(x, h - 1) }
  for (let y = 0; y < h; y += 3) { sample(0, y); sample(w - 1, y) }
  let best = { n: 0, r: 255, g: 255, b: 255 }
  buckets.forEach(v => { if (v.n > best.n) best = v })
  const bgR = best.r / best.n, bgG = best.g / best.n, bgB = best.b / best.n

  const thr = 4300 // ≈ tolerance of ~38 per channel
  const match = (i: number) => {
    const dr = d[i] - bgR, dg = d[i + 1] - bgG, db = d[i + 2] - bgB
    return dr * dr + dg * dg + db * db < thr
  }

  // Flood fill from every border pixel that matches the background.
  const visited = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    const p = y * w + x
    if (visited[p]) return
    visited[p] = 1
    if (match(p * 4)) stack.push(p)
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (stack.length) {
    const p = stack.pop() as number
    d[p * 4 + 3] = 0
    const x = p % w, y = (p / w) | 0
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }

  // Soft edge: semi-fade near-background pixels that touch a cleared one.
  const thr2 = thr * 2.2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x, i = p * 4
      if (d[i + 3] === 0) continue
      const nearClear =
        (x > 0 && d[i - 4 + 3] === 0) || (x < w - 1 && d[i + 4 + 3] === 0) ||
        (y > 0 && d[i - w * 4 + 3] === 0) || (y < h - 1 && d[i + w * 4 + 3] === 0)
      if (!nearClear) continue
      const dr = d[i] - bgR, dg = d[i + 1] - bgG, db = d[i + 2] - bgB
      if (dr * dr + dg * dg + db * db < thr2) d[i + 3] = 110
    }
  }

  ctx.putImageData(img, 0, 0)
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
  )
  const base = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${base}-nobg.png`, { type: 'image/png' })
}

/** 05X-XXXXXXX / 972... → wa.me digits (972…) */
function waPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return d
}

export default function AdminSketchesPage() {
  const [productId, setProductId] = useState('tshirt')
  const [typeId, setTypeId] = useState<string>('cotton')
  const [colorId, setColorId] = useState('')
  const [files, setFiles] = useState<Record<string, File>>({})
  // Pre-background-removal originals, for undo.
  const [originals, setOriginals] = useState<Record<string, File>>({})
  const [removingBg, setRemovingBg] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [creating, setCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const product = PRODUCTS.find(p => p.id === productId)!

  const allowedColors = useMemo(() => {
    const filter = product.colorFilter?.[typeId]
    if (!filter) return product.colors
    return product.colors.filter(c => filter.includes(c.id))
  }, [product, typeId])

  const allowedAreas = useMemo(() => {
    const filter = product.areaFilter?.[typeId]
    if (!filter) return product.areas
    return product.areas.filter(a => filter.includes(a.id))
  }, [product, typeId])

  // Blob previews per area (revoked on change/unmount).
  const previews = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [area, file] of Object.entries(files)) map[area] = URL.createObjectURL(file)
    return map
  }, [files])
  useEffect(() => {
    return () => { Object.values(previews).forEach(u => URL.revokeObjectURL(u)) }
  }, [previews])

  const selectProduct = (id: string) => {
    const p = PRODUCTS.find(x => x.id === id)!
    setProductId(id)
    setTypeId(p.types ? p.types[0].id : '')
    setColorId('')
    setFiles({})
    setOriginals({})
    setShareUrl(null)
  }
  const selectType = (id: string) => {
    setTypeId(id)
    const p = product
    const cf = p.colorFilter?.[id]
    if (colorId && cf && !cf.includes(colorId)) setColorId('')
    const af = p.areaFilter?.[id]
    if (af) {
      setFiles(prev => Object.fromEntries(Object.entries(prev).filter(([a]) => af.includes(a))))
      setOriginals(prev => Object.fromEntries(Object.entries(prev).filter(([a]) => af.includes(a))))
    }
    setShareUrl(null)
  }

  const uploadedCount = Object.keys(files).length
  const canCreate = uploadedCount > 0 && !!colorId && !creating

  const handleRemoveBg = async (areaId: string) => {
    const file = files[areaId]
    if (!file || removingBg) return
    setRemovingBg(areaId)
    try {
      const cleaned = await removeBackgroundFile(file)
      setOriginals(prev => ({ ...prev, [areaId]: file }))
      setFiles(prev => ({ ...prev, [areaId]: cleaned }))
      setShareUrl(null)
    } catch (err) {
      console.error('Background removal failed:', err)
      alert('הסרת הרקע נכשלה לקובץ הזה')
    } finally {
      setRemovingBg(null)
    }
  }

  const handleUndoBg = (areaId: string) => {
    const orig = originals[areaId]
    if (!orig) return
    setFiles(prev => ({ ...prev, [areaId]: orig }))
    setOriginals(prev => { const u = { ...prev }; delete u[areaId]; return u })
    setShareUrl(null)
  }

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    try {
      const sessionId = `sketch-${Date.now()}`
      const designs: { area: string; areaName: string; imageBase64: string }[] = []
      for (const [area, file] of Object.entries(files)) {
        const url = await uploadDesignFile(file, sessionId, generateUniqueFileName(file.name))
        const areaName = product.areas.find(a => a.id === area)?.name || area
        // `imageBase64` historically holds the image source — an https Storage
        // URL works everywhere (share page <img> + 3D via the design proxy)
        // and keeps the Firestore doc tiny (phone photos would burst the 1MB
        // doc limit as base64).
        designs.push({ area, areaName, imageBase64: url })
      }
      const id = await createSharedDesign({
        productType: productId,
        color: colorId,
        ...(typeId ? { fabricType: typeId } : {}),
        designs,
      })
      setShareUrl(`${window.location.origin}/share/${id}`)
    } catch (err) {
      console.error('Sketch creation failed:', err)
      alert('יצירת הסקיצה נכשלה. נסה/י שוב בעוד רגע.')
    } finally {
      setCreating(false)
    }
  }

  const waLink = useMemo(() => {
    if (!shareUrl) return '#'
    const text = encodeURIComponent(`היי! הכנו עבורך סקיצה 🎨\nאפשר לצפות בה כאן:\n${shareUrl}`)
    const p = waPhone(phone)
    return p.length >= 11 ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`
  }, [shareUrl, phone])

  const copyLink = async () => {
    if (!shareUrl) return
    try { await navigator.clipboard.writeText(shareUrl) } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => { setFiles({}); setOriginals({}); setColorId(''); setShareUrl(null); setPhone('') }

  // ── Preview ──
  const colorHex = allowedColors.find(c => c.id === colorId)?.hex ?? '#d1d5db'
  const m3d = getModel3D(productId, typeId || undefined)
  const previewDesigns = Object.entries(previews).map(([area, url]) => ({ area, url }))
  const previewEl = m3d ? (
    <ThreeErrorBoundary fallback={
      <div className="relative w-full flex items-center justify-center rounded-2xl border bg-gray-50 p-6" style={{ aspectRatio: '3/4' }}>
        {previewDesigns[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewDesigns[0].url} alt="עיצוב" className="max-w-[70%] max-h-[70%] object-contain" />
        ) : <span className="text-sm text-gray-400">תצוגה מקדימה</span>}
      </div>
    }>
      <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
        <Preview3DStage
          warmAll
          colorHex={colorHex}
          designs={previewDesigns}
          showGuides
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          variant={m3d.variant as any}
          modelUrl={m3d.url}
        />
      </div>
    </ThreeErrorBoundary>
  ) : (
    <div className="relative w-full flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-gray-200 p-6" style={{ aspectRatio: '3/4', backgroundColor: colorId ? `${colorHex}22` : '#f9fafb' }}>
      {previewDesigns.length > 0 ? previewDesigns.map(d => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={d.area} src={d.url} alt="עיצוב" className="max-w-[70%] max-h-[45%] object-contain" />
      )) : <span className="text-sm text-gray-400">העלו עיצוב לתצוגה</span>}
    </div>
  )

  return (
    <div dir="rtl" className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl gradient-yellow flex items-center justify-center">
          <Paintbrush className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מייצר סקיצות</h1>
          <p className="text-sm text-gray-500">בונים סקיצה מקובצי הלקוח ומשתפים אליו בוואטסאפ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <div className="space-y-5">
          {/* Product */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-sm mb-3">מוצר</h3>
            <div className="flex flex-wrap gap-2">
              {PRODUCTS.map(p => (
                <button key={p.id} onClick={() => selectProduct(p.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${productId === p.id ? 'gradient-yellow text-white border-transparent shadow' : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-400'}`}>
                  {p.name}
                </button>
              ))}
            </div>
            {product.types && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                {product.types.map(t => (
                  <button key={t.id} onClick={() => selectType(t.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${typeId === t.id ? 'bg-gray-900 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-sm mb-3">צבע {colorId ? <span className="font-normal text-gray-500">— {allowedColors.find(c => c.id === colorId)?.name}</span> : <span className="font-normal text-red-400">(חובה)</span>}</h3>
            <div className="flex flex-wrap gap-3">
              {allowedColors.map(c => (
                <button key={c.id} onClick={() => { setColorId(c.id); setShareUrl(null) }} aria-label={c.name}
                  className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${colorId === c.id ? 'ring-4 ring-[#fbbf24] ring-offset-2 scale-110' : 'hover:scale-105'} ${c.border ? 'border border-gray-300' : ''}`}
                  style={{ backgroundColor: c.hex }}>
                  {colorId === c.id && <Check className={`w-4 h-4 ${['white','beige','yellow','pink','lightblue','babypink','melange'].includes(c.id) ? 'text-gray-800' : 'text-white'}`} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Areas + uploads */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-sm mb-3">קבצי העיצוב <span className="font-normal text-gray-500">— לחצו על אזור כדי להעלות ({uploadedCount} הועלו)</span></h3>
            <div className="grid grid-cols-2 gap-3">
              {allowedAreas.map(area => {
                const file = files[area.id]
                return (
                  <div key={area.id} className={`rounded-xl border-2 ${file ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-300'} p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">{area.name}</span>
                      {file && (
                        <button onClick={() => {
                          setFiles(prev => { const u = { ...prev }; delete u[area.id]; return u })
                          setOriginals(prev => { const u = { ...prev }; delete u[area.id]; return u })
                          setShareUrl(null)
                        }}
                          className="text-red-400 hover:text-red-600" aria-label={`הסרת קובץ מ${area.name}`}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <label className="cursor-pointer block">
                      {file ? (
                        <div
                          className="w-full h-20 rounded-lg overflow-hidden border border-green-200 flex items-center justify-center"
                          style={{ background: 'repeating-conic-gradient(#e8e8e8 0 25%, #ffffff 0 50%) 0 0 / 14px 14px' }}
                        >
                          {previews[area.id] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previews[area.id]} alt={area.name} className="max-w-full max-h-full object-contain" />
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-20 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 transition-colors">
                          <ImagePlus className="w-6 h-6 mb-1" />
                          <span className="text-[11px]">העלאת קובץ</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) {
                            setFiles(prev => ({ ...prev, [area.id]: f }))
                            setOriginals(prev => { const u = { ...prev }; delete u[area.id]; return u })
                            setShareUrl(null)
                          }
                          e.target.value = ''
                        }} />
                    </label>
                    {file && (
                      originals[area.id] ? (
                        <button
                          onClick={() => handleUndoBg(area.id)}
                          className="mt-2 w-full h-8 rounded-md border border-gray-300 text-[11px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          בטל הסרת רקע
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveBg(area.id)}
                          disabled={removingBg !== null}
                          className="mt-2 w-full h-8 rounded-md border border-purple-300 bg-purple-50 text-[11px] font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {removingBg === area.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Eraser className="w-3 h-3" />}
                          {removingBg === area.id ? 'מסיר רקע...' : 'הסר רקע'}
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Share */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-bold text-sm">שיתוף ללקוח</h3>
            <Input dir="ltr" inputMode="tel" placeholder="טלפון הלקוח (לא חובה) 050-1234567" value={phone} onChange={e => setPhone(e.target.value)} className="text-left" />
            {!shareUrl ? (
              <Button onClick={handleCreate} disabled={!canCreate} className="w-full gradient-yellow text-white font-bold h-11 disabled:opacity-50">
                {creating ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />מעלה קבצים ויוצר סקיצה...</span> : 'צור סקיצה 🎨'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 break-all text-gray-600" dir="ltr">{shareUrl}</div>
                <div className="grid grid-cols-3 gap-2">
                  <a href={waLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 h-10 rounded-md bg-[#25D366] text-white text-sm font-bold hover:opacity-90">
                    <Share2 className="w-4 h-4" />וואטסאפ
                  </a>
                  <Button variant="outline" onClick={copyLink} className="h-10">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    <span className="mr-1">{copied ? 'הועתק' : 'העתק'}</span>
                  </Button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 h-10 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                    <ExternalLink className="w-4 h-4" />פתח
                  </a>
                </div>
                <Button variant="outline" onClick={resetAll} className="w-full h-9 text-xs text-gray-500">
                  <RefreshCw className="w-3.5 h-3.5 ml-1" />סקיצה חדשה
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Live preview ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-sm mb-3">תצוגה מקדימה — מה שהלקוח יראה</h3>
            {previewEl}
          </div>
        </div>
      </div>
    </div>
  )
}
