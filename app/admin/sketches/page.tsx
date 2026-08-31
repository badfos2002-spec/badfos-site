'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImagePlus, X, Check, Loader2, Share2, Copy, ExternalLink, RefreshCw, Paintbrush, Eraser, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, RotateCcw, Info, AlertTriangle, History, Pencil, Trash2 } from 'lucide-react'
import { uploadDesignFile, generateUniqueFileName, deleteFile } from '@/lib/storage'
import { compressSketchImage, sketchUploadErrorMessage } from '@/lib/sketch-image'
import { useCoarsePointer } from '@/hooks/useCoarsePointer'
import { createSharedDesign, updateSharedDesign, getRecentSharedDesigns, deleteDocument, type SharedDesignData, type SharedDesignHistoryItem } from '@/lib/db'
import { captureSketchPreview } from '@/lib/sketch-preview'
import { isSketchPreviewUrl, timestampMillis, storagePathFromUrl } from '@/lib/sketch-retention'
import type { Timestamp } from 'firebase/firestore'
import {
  FABRIC_TYPES, TSHIRT_COLORS, FABRIC_COLOR_FILTER, TSHIRT_DESIGN_AREAS,
  SWEATSHIRT_TYPES, SWEATSHIRT_COLORS, SWEATSHIRT_COLOR_FILTER, SWEATSHIRT_DESIGN_AREAS, SWEATSHIRT_AREA_FILTER,
  CAP_TYPES, CAP_COLORS, CAP_COLOR_FILTER, CAP_DESIGN_AREAS, CAP_AREA_FILTER,
  TOTE_TYPES, TOTE_COLORS, TOTE_COLOR_FILTER, TOTE_DESIGN_AREAS, TOTE_AREA_FILTER,
  BUFF_COLORS, BUFF_DESIGN_AREAS, APRON_COLORS, APRON_DESIGN_AREAS, BABY_COLORS, BABY_DESIGN_AREAS,
  VEST_COLORS, VEST_DESIGN_AREAS,
  getModel3D, getColorLabel, getProductLabel, getTypeLabel,
} from '@/lib/constants'
import nextDynamic from 'next/dynamic'
import { DEFAULT_TRANSFORM, clampTransform, isDefaultTransform, type DesignTransform } from '@/components/designer/three/decalTransform'
import type { DecalPreviewFn } from '@/components/designer/three/DecalDragController'
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
  { id: 'vest', name: 'וסט זוהר', types: null, colors: VEST_COLORS as unknown as ColorDef[], areas: VEST_DESIGN_AREAS as unknown as AreaDef[] },
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
  // The cut-out is illustration only, and compressSketchImage caps what actually
  // ships at a 1600px longest edge — so 3000 bought nothing above the display
  // ceiling while making the flood fill chew through 9M pixels (and its output
  // PNG-with-alpha the file that broke the 15MB Storage rule). 2000 keeps
  // headroom over 1600, cuts the fill work ~2.25x, and lands under the cap on
  // its own for ordinary artwork.
  const MAX = 2000
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

/** One arrow tap. Local model units — see decalTransform.MAX_OFFSET (0.35). */
const NUDGE = 0.01

/** Binary floats do not sum back to zero: ten "up" taps then ten "down" taps
 *  land on `dy = -3.47e-18`, so `isDefaultTransform` reads false and a design
 *  the admin visually returned to centre gets a `transform` written to
 *  Firestore. Snapping to the arrow step's own precision makes the round trip
 *  land exactly on 0. */
const round3 = (v: number) => Math.round(v * 1000) / 1000

/** 05X-XXXXXXX / 972... → wa.me digits (972…) */
function waPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return d
}

/** History rows per fetch. */
const HISTORY_PAGE = 20

/** What the maker is editing, when it is not creating from scratch. */
interface EditingState {
  /** The `shared_designs` doc id — updates land on THIS doc, so the customer's
   *  existing share link shows the new revision. */
  id: string
  /** The doc was swept (originals deleted): every original area must be
   *  re-uploaded before an update can be saved. */
  swept: boolean
  /** Areas the swept doc had — the re-upload checklist. Empty when live. */
  requiredAreas: string[]
  /** The swept doc's preview still, shown as reference while re-uploading. */
  sweptPreview: string | null
}

/** "24.08.26 14:05" from a Firestore Timestamp-ish value, or null. */
function formatWhen(value: unknown): string | null {
  const ms = timestampMillis(value)
  if (ms === null) return null
  const d = new Date(ms)
  return `${d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * The customer-facing link for a sketch. An UPDATED sketch gets
 * `?v=<updatedAt seconds>`: WhatsApp caches its link preview PER URL for days,
 * so re-sharing the bare /share/<id> after an update keeps showing the old
 * card no matter what og:image now says. A changed URL forces a fresh crawl —
 * the share page itself ignores the query (the id comes from the path).
 * Never-updated sketches keep the clean URL.
 */
function shareUrlFor(id: string, updatedAt?: unknown): string {
  const ms = timestampMillis(updatedAt)
  return `${window.location.origin}/share/${id}${ms !== null ? `?v=${Math.floor(ms / 1000)}` : ''}`
}

/** Copy with the execCommand fallback (clipboard API needs a secure context). */
async function copyText(text: string): Promise<void> {
  try { await navigator.clipboard.writeText(text) } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
  }
}

/** History thumbnail: the sketch preview still, or a neutral placeholder when
 *  there is none / it fails to load (never a broken-image icon). */
function HistoryThumb({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
        <Paintbrush className="w-5 h-5 text-gray-300" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setBroken(true)}
      className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 object-cover bg-white" />
  )
}

export default function AdminSketchesPage() {
  const [productId, setProductId] = useState('tshirt')
  const [typeId, setTypeId] = useState<string>('cotton')
  const [colorId, setColorId] = useState('')
  const [files, setFiles] = useState<Record<string, File>>({})
  // Pre-background-removal originals, for undo.
  const [originals, setOriginals] = useState<Record<string, File>>({})
  // Edit mode: artwork that ALREADY lives in Storage (per-area https URL).
  // A new File in `files` shadows it; untouched areas keep these URLs on save
  // and are never re-uploaded. Disjoint from nothing — `files` wins on merge.
  const [existing, setExisting] = useState<Record<string, string>>({})
  // Non-null while a history sketch is loaded for editing.
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [removingBg, setRemovingBg] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  // Why the last attempt failed, in Hebrew the owner can act on. A generic
  // "יצירת הסקיצה נכשלה" is what hid a 15MB Storage-rule rejection for weeks.
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Per-area adjustment. A missing entry IS the default — never substitute an
  // inline `{dx:0,dy:0,scale:1}` literal when handing it down: a fresh object
  // each render busts the `eff` memo in ShirtDecal and reprojects for nothing.
  const [transforms, setTransforms] = useState<Record<string, DesignTransform>>({})
  const [editArea, setEditArea] = useState<string | null>(null)
  // Guides off while the share-link snapshot is taken: the dashed
  // placeholder boxes are an authoring aid, and the customer's share page
  // never shows them. `editArea` deliberately stays put, so the snapshot
  // keeps facing whatever the owner was looking at.
  const [capturing, setCapturing] = useState(false)
  // The save finished but the WhatsApp still could not be captured/uploaded —
  // the link will preview with the logo. Shown to the owner instead of failing
  // silently: a whole day of logo-card sketches once shipped this way with no
  // signal anywhere.
  const [previewFailed, setPreviewFailed] = useState(false)
  // Bumped before every save and on entering edit mode. ThreeErrorBoundary is
  // sticky once tripped — in a long-lived admin tab that meant every later
  // capture found no stage and silently fell back to the logo. A changed key
  // clears a tripped boundary; a healthy one ignores it.
  const [stageEpoch, setStageEpoch] = useState(0)
  // Size slider: `input` fires on every step of a drag, and each committed step
  // is a full DecalGeometry rebuild (248 ms on the t-shirt). The live value
  // previews imperatively through this ref; only release commits. Filled by the
  // drag controller while an area is being edited.
  const previewRef = useRef<DecalPreviewFn | null>(null)
  // Wraps the 3D stage, so the share-link snapshot can find its WebGL canvas.
  const previewBoxRef = useRef<HTMLDivElement | null>(null)
  const [sizeUi, setSizeUi] = useState(1)
  const coarse = useCoarsePointer()

  // ── History ──
  const [history, setHistory] = useState<SharedDesignHistoryItem[]>([])
  const [historyCursor, setHistoryCursor] = useState<Timestamp | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [copiedRow, setCopiedRow] = useState<string | null>(null)
  // Row whose delete is awaiting confirmation. Deleting kills the customer's
  // link, so a stray tap must not do it — same posture as the orders-pause
  // toggle: the destructive direction takes an explicit second, in-page confirm.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deletingRow, setDeletingRow] = useState<string | null>(null)
  // ── Bulk selection ──
  // Ids ticked for מחיקה ביחד. Survives "טען עוד" (earlier rows stay ticked);
  // a row that leaves the list leaves the selection too (onSketchGone), so the
  // counter never counts ghosts.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Bulk confirm strip open — same explicit-second-confirm posture as the
  // per-row trash. Any selection change closes it: the question it asks
  // ("למחוק X סקיצות?") must always describe the set that will actually go.
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  // Honest outcome of the last bulk run ("נמחקו 2 מתוך 3") — cleared as soon
  // as the selection changes, so it never describes a different set of rows.
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  const loadHistory = async (cursor: Timestamp | null) => {
    setHistoryLoading(true)
    setHistoryError(false)
    try {
      const { items, nextCursor } = await getRecentSharedDesigns(HISTORY_PAGE, cursor ?? undefined)
      setHistory(prev => (cursor ? [...prev, ...items] : items))
      setHistoryCursor(nextCursor)
    } catch (err) {
      console.error('Sketch history fetch failed:', err)
      setHistoryError(true)
    } finally {
      setHistoryLoading(false)
    }
  }
  useEffect(() => {
    loadHistory(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Blob previews for freshly uploaded files (revoked on change/unmount).
  const blobPreviews = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [area, file] of Object.entries(files)) map[area] = URL.createObjectURL(file)
    return map
  }, [files])
  useEffect(() => {
    return () => { Object.values(blobPreviews).forEach(u => URL.revokeObjectURL(u)) }
  }, [blobPreviews])
  // What each area actually shows: a new File's blob URL when one was uploaded,
  // else the already-stored https URL loaded from the doc being edited. The 3D
  // stage takes either happily (the share page renders these same https URLs).
  const previews = useMemo(() => ({ ...existing, ...blobPreviews }), [existing, blobPreviews])

  const selectProduct = (id: string) => {
    const p = PRODUCTS.find(x => x.id === id)!
    const firstType = p.types ? p.types[0].id : ''
    setProductId(id)
    setTypeId(firstType)
    setColorId('')
    setFiles({})
    setOriginals({})
    // Existing artwork belongs to the areas of the product it was made for.
    setExisting({})
    setTransforms({})
    setEditArea(null)
    // Editing survives a product switch (updating the sketch to a sweatshirt is
    // legitimate), but a swept doc's re-upload checklist must only name areas
    // the NEW product can print — otherwise עדכן could never re-enable.
    const af = p.areaFilter?.[firstType]
    setEditing(prev => prev
      ? { ...prev, requiredAreas: prev.requiredAreas.filter(a => p.areas.some(x => x.id === a) && (!af || af.includes(a))) }
      : prev)
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
      setExisting(prev => Object.fromEntries(Object.entries(prev).filter(([a]) => af.includes(a))))
      // The transform of an area this fabric cannot print goes with its file.
      setTransforms(prev => Object.fromEntries(Object.entries(prev).filter(([a]) => af.includes(a))))
      // A swept sketch's re-upload checklist can only ask for areas that exist.
      setEditing(prev => prev ? { ...prev, requiredAreas: prev.requiredAreas.filter(a => af.includes(a)) } : prev)
      if (editArea && !af.includes(editArea)) setEditArea(null)
    }
    setShareUrl(null)
  }

  const uploadedCount = Object.keys(previews).length
  // Swept sketch: the originals are gone, so every area the doc had must be
  // re-uploaded before an update may save — otherwise the update would write
  // designs whose files no longer exist.
  const missingReupload = editing?.swept ? editing.requiredAreas.filter(a => !files[a]) : []
  const canCreate = uploadedCount > 0 && !!colorId && !creating && missingReupload.length === 0

  // What still blocks the button, in the order the form asks for it. A grey
  // button with no explanation is the whole problem — this drives BOTH the hint
  // above it and the button's own label, so the two can never disagree.
  const missing = useMemo(() => {
    const m: string[] = []
    if (!colorId) m.push('בחרו צבע')
    if (uploadedCount === 0) m.push('העלו קובץ עיצוב')
    else if (missingReupload.length > 0) m.push('העלו מחדש את כל הקבצים')
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorId, uploadedCount, missingReupload.length])

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

  // ── Design arrangement (per-area transform) ──
  /** The single write path: state + slider readout + stale share link. */
  const commitTransform = (area: string, t: DesignTransform) => {
    setTransforms(prev => ({ ...prev, [area]: t }))
    setSizeUi(t.scale)
    setShareUrl(null)
  }

  const toggleEditArea = (id: string) => {
    if (editArea === id) { setEditArea(null); return }
    setEditArea(id)
    setSizeUi(transforms[id]?.scale ?? 1)
  }

  /** Arrow taps. `ddx`/`ddy` are SCREEN directions: +x right, +y up — the drag
   *  controller uses the same frame, so the page's RTL never enters into it. */
  const nudge = (ddx: number, ddy: number) => {
    if (!editArea) return
    const cur = transforms[editArea] ?? DEFAULT_TRANSFORM
    commitTransform(editArea, clampTransform({ dx: round3(cur.dx + ddx), dy: round3(cur.dy + ddy), scale: cur.scale }))
  }

  /** Called on pointerup/keyup only — never from `onChange`. */
  const commitSize = (v: number) => {
    if (!editArea) return
    const cur = transforms[editArea] ?? DEFAULT_TRANSFORM
    if (cur.scale === v) return // a click that moved nothing must not reproject
    commitTransform(editArea, clampTransform({ ...cur, scale: v }))
  }

  const resetArea = () => {
    if (!editArea) return
    // Delete rather than store the default: an absent entry keeps `withTransform`
    // returning the original placement object, exactly as an untouched area does.
    setTransforms(prev => { const u = { ...prev }; delete u[editArea]; return u })
    setSizeUi(1)
    setShareUrl(null)
  }

  /**
   * A duplicate must OWN its files. If the new doc borrowed the original's
   * URLs, the original's retention sweep (which deletes the exact paths ITS
   * doc names) would delete them out from under the duplicate while the
   * duplicate is still fresh. Fetched through the same-origin design proxy —
   * Firebase download URLs serve without CORS headers.
   */
  const copyExistingFile = async (url: string, sessionId: string, area: string): Promise<string> => {
    // Legacy pre-Storage sketches inlined the image itself — self-contained,
    // nothing in Storage to copy.
    if (url.startsWith('data:')) return url
    const res = await fetch(`/api/design-proxy?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error(`לא הצלחנו להעתיק קובץ קיים (${res.status})`)
    const blob = await res.blob()
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : blob.type.includes('svg') ? 'svg' : 'jpg'
    const f = new File([blob], `${area}-copy.${ext}`, { type: blob.type || 'image/png' })
    return uploadDesignFile(f, sessionId, generateUniqueFileName(f.name))
  }

  /**
   * One save path for all three flows:
   *  - 'create'    — today's fresh sketch, byte-for-byte (new doc, preview.jpg).
   *  - 'update'    — writes the SAME doc, so the customer's existing link shows
   *    the new revision. The preview goes up under a NEW filename: WhatsApp
   *    caches per URL, so overwriting preview.jpg would keep showing the stale
   *    image; a fresh URL gets a fresh crawl.
   *  - 'duplicate' — a new doc from the current state ("אותו דבר אבל בשחור"),
   *    with existing files copied so the new sketch owns its Storage objects.
   * Areas whose artwork was not touched keep their existing URL and are NOT
   * re-uploaded ('update' only).
   */
  const handleSave = async (mode: 'create' | 'update' | 'duplicate') => {
    if (!canCreate) return
    if (mode === 'update' && !editing) return
    setCreating(true)
    setErrorMsg(null)
    setPreviewFailed(false)
    // Give a tripped 3D stage one fresh chance before the snapshot (no-op on a
    // healthy stage). The state flush lands at the first await below.
    setStageEpoch(e => e + 1)
    try {
      const sessionId = `sketch-${Date.now()}`
      // Snapshot the stage FIRST, so the link preview is exactly the frame the
      // owner was looking at when they clicked. Isolated in its own try: a
      // failed capture or upload must cost the preview only — never the sketch,
      // which then simply falls back to the logo in the link preview (on
      // update: to the previous still, which updateSharedDesign keeps).
      let previewUrl: string | null = null
      setCapturing(true)
      try {
        // React flushes the `capturing` re-render well inside the snapshot's
        // 500ms stability window, and a guide disappearing resets that window —
        // so the frame that gets captured is always the guide-free one.
        const shot = await captureSketchPreview(previewBoxRef.current, Object.values(previews))
        if (shot) {
          const previewName = mode === 'update' ? `preview-${Date.now()}.jpg` : 'preview.jpg'
          previewUrl = await uploadDesignFile(
            new File([shot], previewName, { type: 'image/jpeg' }),
            sessionId,
            previewName,
          )
        }
      } catch (err) {
        console.error('[SKETCH_PREVIEW_UPLOAD_FAILED] Sketch preview unavailable — falling back to the logo:', err)
      } finally {
        setCapturing(false)
      }
      // Surfaced only after the save succeeds (below); a failed save has its
      // own error and no doc to warn about.
      const previewMissing = !previewUrl
      const designs: { area: string; areaName: string; imageBase64: string; transform?: DesignTransform }[] = []
      for (const area of Object.keys(previews)) {
        const file = files[area]
        let url: string
        if (file) {
          // storage.rules rejects anything >=30MB under designs/, and Firebase
          // surfaces that as `storage/unauthorized` — so shrink before uploading.
          // Sketch files are illustration only and keep a much tighter budget than
          // the rule allows; the print masters come from the customer designers,
          // go through lib/print-image.ts, and are never routed through here.
          const ready = await compressSketchImage(file)
          if (ready !== file) console.info(`[sketch] ${file.name}: ${file.size} → ${ready.size} bytes (${ready.type})`)
          url = await uploadDesignFile(ready, sessionId, generateUniqueFileName(ready.name))
        } else if (mode === 'duplicate') {
          url = await copyExistingFile(existing[area], sessionId, area)
        } else {
          // Untouched area on update: the file already sits in Storage under
          // this very doc — no re-upload, the URL carries over as-is.
          url = existing[area]
        }
        const areaName = product.areas.find(a => a.id === area)?.name || area
        // `imageBase64` historically holds the image source — an https Storage
        // URL works everywhere (share page <img> + 3D via the design proxy)
        // and keeps the Firestore doc tiny (phone photos would burst the 1MB
        // doc limit as base64).
        // The key must be ABSENT, not `undefined`: lib/firebase.ts uses plain
        // `getFirestore` with no `ignoreUndefinedProperties`, so an explicit
        // `transform: undefined` inside the array makes `addDoc` throw.
        const t = transforms[area]
        designs.push({ area, areaName, imageBase64: url, ...(isDefaultTransform(t) ? {} : { transform: t }) })
      }
      const payload: SharedDesignData = {
        productType: productId,
        color: colorId,
        ...(typeId ? { fabricType: typeId } : {}),
        // Absent, never `undefined` — lib/firebase.ts has no
        // ignoreUndefinedProperties, so an explicit undefined makes addDoc throw.
        ...(previewUrl ? { previewUrl } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(label.trim() ? { label: label.trim() } : {}),
        designs,
      }
      let id: string
      // Set on update only — versions the share link so WhatsApp's per-URL
      // preview cache re-crawls. Create/duplicate mint a fresh id, which is a
      // fresh URL already.
      let updatedAt: Timestamp | null = null
      if (mode === 'update') {
        updatedAt = await updateSharedDesign(editing!.id, payload)
        id = editing!.id
      } else {
        id = await createSharedDesign(payload)
      }
      if (mode !== 'create') {
        // Stay in edit mode on the saved doc (duplicate switches to the copy):
        // what was just uploaded is now "existing", so a follow-up tweak only
        // re-uploads what it changes.
        setExisting(Object.fromEntries(designs.map(d => [d.area, d.imageBase64])))
        setFiles({})
        setOriginals({})
        setEditing({ id, swept: false, requiredAreas: [], sweptPreview: null })
      }
      setShareUrl(shareUrlFor(id, updatedAt))
      // On update a missing capture keeps the PREVIOUS still (updateSharedDesign
      // never deletes previewUrl), so only create/duplicate degrade to the logo.
      setPreviewFailed(previewMissing && mode !== 'update')
      loadHistory(null)
    } catch (err) {
      console.error('Sketch save failed:', err)
      setErrorMsg(sketchUploadErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  /**
   * Load a history sketch into the maker. Live artwork arrives as its https
   * Storage URL (`existing`); a SWEPT sketch has no artwork left, so every
   * area it had goes on the re-upload checklist and only its preview still is
   * shown as reference — broken image URLs are never rendered.
   */
  const loadForEdit = (item: SharedDesignHistoryItem) => {
    const p = PRODUCTS.find(x => x.id === item.productType)
    if (!p) {
      setErrorMsg(`מוצר לא מוכר בסקיצה הזו (${item.productType}) — אי אפשר לערוך אותה כאן`)
      return
    }
    const fabric = item.fabricType && p.types?.some(t => t.id === item.fabricType)
      ? item.fabricType
      : (p.types ? p.types[0].id : '')
    const swept = item.designsDeleted === true
    const af = p.areaFilter?.[fabric]
    const inAreas = (a: string) => p.areas.some(x => x.id === a) && (!af || af.includes(a))
    const ex: Record<string, string> = {}
    const tr: Record<string, DesignTransform> = {}
    const docAreas: string[] = []
    for (const d of item.designs ?? []) {
      if (!inAreas(d.area)) continue
      docAreas.push(d.area)
      // https Storage URLs and legacy inline data: URLs both render; anything
      // else (blob: from a dead session, junk) requires re-upload.
      if (!swept && typeof d.imageBase64 === 'string' && (d.imageBase64.startsWith('https://') || d.imageBase64.startsWith('data:image/'))) {
        ex[d.area] = d.imageBase64
      }
      // Doc data is untrusted: a malformed transform (missing field, string,
      // NaN) would flow into the decal math as NaN and can throw inside the
      // render loop — tripping ThreeErrorBoundary and killing the 3D stage
      // (and with it the preview capture). Finite numbers only, then clamped.
      const t = d.transform
      if (
        t && Number.isFinite(t.dx) && Number.isFinite(t.dy) && Number.isFinite(t.scale) &&
        !isDefaultTransform(t)
      ) {
        tr[d.area] = clampTransform(t)
      }
    }
    setProductId(item.productType)
    setTypeId(fabric)
    setColorId(item.color)
    setFiles({})
    setOriginals({})
    setExisting(ex)
    setTransforms(tr)
    setEditArea(null)
    setPhone(item.phone ?? '')
    setLabel(item.label ?? '')
    setShareUrl(null)
    setErrorMsg(null)
    setEditing({
      id: item.id,
      swept,
      requiredAreas: swept ? docAreas : [],
      sweptPreview: swept && isSketchPreviewUrl(item.previewUrl) ? item.previewUrl : null,
    })
    setPreviewFailed(false)
    // A stage that tripped on a previous sketch gets a clean start with this one.
    setStageEpoch(e => e + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const waLink = useMemo(() => {
    if (!shareUrl) return '#'
    const text = encodeURIComponent(`היי! הכנו עבורך סקיצה 🎨\nאפשר לצפות בה כאן:\n${shareUrl}`)
    const p = waPhone(phone)
    return p.length >= 11 ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`
  }, [shareUrl, phone])

  const copyLink = async () => {
    if (!shareUrl) return
    await copyText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyRowLink = async (item: SharedDesignHistoryItem) => {
    await copyText(shareUrlFor(item.id, item.updatedAt))
    setCopiedRow(item.id)
    setTimeout(() => setCopiedRow(null), 2000)
  }

  // Built on click, not in render: window is not there during SSR.
  const openRowWhatsApp = (item: SharedDesignHistoryItem) => {
    const url = shareUrlFor(item.id, item.updatedAt)
    const text = encodeURIComponent(`היי! הכנו עבורך סקיצה 🎨\nאפשר לצפות בה כאן:\n${url}`)
    const p = waPhone(item.phone ?? '')
    window.open(p.length >= 11 ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  // Transforms go too — otherwise the previous customer's adjustment silently
  // lands on the next sketch that uses the same areaId. Exits edit mode.
  const resetAll = () => { setFiles({}); setOriginals({}); setExisting({}); setEditing(null); setTransforms({}); setEditArea(null); setColorId(''); setShareUrl(null); setPhone(''); setLabel(''); setErrorMsg(null); setPreviewFailed(false) }

  /**
   * Delete a sketch for good. The DOC delete comes first — it is the action
   * that kills the customer's link, and it must not depend on Storage. The
   * files the doc names (artwork + preview) then go best-effort, each resolved
   * through storagePathFromUrl so only exact, verified `designs/...` paths are
   * ever deleted — a failed file delete logs and moves on (an orphaned file
   * costs bucket bytes; aborting midway would cost correctness).
   * Client-side on purpose: firestore.rules gives shared_designs delete to
   * isAdmin(), storage.rules gives designs/ delete to any signed-in user, and
   * this page only renders behind the admin's Firebase sign-in.
   * Returns false only when the DOC delete failed (the sketch still exists);
   * Storage failures never fail it. UI updates are the caller's job.
   */
  const deleteSketchForGood = async (item: SharedDesignHistoryItem): Promise<boolean> => {
    try {
      await deleteDocument('shared_designs', item.id)
    } catch (err) {
      console.error('Sketch delete failed:', err)
      return false
    }
    const paths: string[] = []
    for (const d of item.designs ?? []) {
      const p = storagePathFromUrl(d?.imageBase64)
      if (p && !paths.includes(p)) paths.push(p)
    }
    const previewPath = storagePathFromUrl(item.previewUrl)
    if (previewPath && !paths.includes(previewPath)) paths.push(previewPath)
    for (const path of paths) {
      try { await deleteFile(path) } catch (err) { console.error(`[SKETCH_DELETE_FILE_FAILED] ${path}:`, err) }
    }
    return true
  }

  /** Everything the UI owes once a sketch is gone — shared by the per-row
   *  trash and the bulk delete, so the two can never drift apart. */
  const onSketchGone = (id: string) => {
    setHistory(prev => prev.filter(x => x.id !== id))
    setSelected(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev); next.delete(id); return next
    })
    // The maker must not keep operating on a doc that no longer exists.
    if (editing?.id === id) resetAll()
    // Nor may the share box keep offering the now-dead link (fresh create,
    // then its row deleted — editing is null in that flow).
    else if (shareUrl && new URL(shareUrl).pathname === `/share/${id}`) { setShareUrl(null); setPreviewFailed(false) }
  }

  const handleDelete = async (item: SharedDesignHistoryItem) => {
    if (deletingRow || bulkDeleting) return
    setDeletingRow(item.id)
    if (!(await deleteSketchForGood(item))) {
      alert('מחיקת הסקיצה נכשלה — נסו שוב')
      setDeletingRow(null)
      return
    }
    onSketchGone(item.id)
    setConfirmDelete(null)
    setDeletingRow(null)
  }

  /**
   * Bulk delete: the exact single-sketch routine per id, up to 3 in flight.
   * One failing sketch must not abort the rest — a doc whose delete failed
   * stays in the list untouched, and the outcome message says exactly how
   * many actually went.
   */
  const handleBulkDelete = async () => {
    if (bulkDeleting || deletingRow) return
    const items = history.filter(x => selected.has(x.id))
    if (items.length === 0) return
    setBulkDeleting(true)
    let ok = 0
    const queue = [...items]
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        if (await deleteSketchForGood(item)) { ok++; onSketchGone(item.id) }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setBulkResult(ok === items.length
      ? (ok === 1 ? 'הסקיצה שנבחרה נמחקה' : `נמחקו ${ok} הסקיצות שנבחרו`)
      : `נמחקו ${ok} מתוך ${items.length} — מה שנכשל נשאר ברשימה`)
    setSelected(new Set())
    setConfirmBulk(false)
    setBulkDeleting(false)
  }

  const toggleSelect = (id: string) => {
    setBulkResult(null)
    setConfirmBulk(false)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const allSelected = history.length > 0 && history.every(x => selected.has(x.id))
  const toggleSelectAll = () => {
    setBulkResult(null)
    setConfirmBulk(false)
    setSelected(allSelected ? new Set() : new Set(history.map(x => x.id)))
  }

  // ── Preview ──
  const colorHex = allowedColors.find(c => c.id === colorId)?.hex ?? '#d1d5db'
  const m3d = getModel3D(productId, typeId || undefined)
  const previewDesigns = Object.entries(previews).map(([area, url]) => ({ area, url, transform: transforms[area] }))
  const previewEl = m3d ? (
    <ThreeErrorBoundary resetKey={stageEpoch} fallback={
      <div className="relative w-full flex items-center justify-center rounded-2xl border bg-gray-50 p-6" style={{ aspectRatio: '3/4' }}>
        {previewDesigns[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewDesigns[0].url} alt="עיצוב" className="max-w-[70%] max-h-[70%] object-contain" />
        ) : <span className="text-sm text-gray-400">תצוגה מקדימה</span>}
      </div>
    }>
      <div ref={previewBoxRef} className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
        <Preview3DStage
          warmAll
          noHint
          colorHex={colorHex}
          designs={previewDesigns}
          showGuides={!capturing}
          editArea={editArea ?? undefined}
          onCommit={commitTransform}
          previewRef={previewRef}
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

  // ── Arrangement panel (3D only — the 2D fallback ignores the transform) ──
  const uploadedAreas = allowedAreas.filter(a => files[a.id])
  const arrangeEl = m3d && uploadedAreas.length > 0 ? (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h4 className="font-bold text-sm">סידור העיצוב</h4>
        {uploadedAreas.map(a => (
          <button key={a.id} onClick={() => toggleEditArea(a.id)}
            aria-pressed={editArea === a.id}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${editArea === a.id ? 'gradient-yellow text-white border-transparent shadow' : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-400'}`}>
            {a.name}
          </button>
        ))}
      </div>

      {editArea ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="flex items-center gap-1 text-[11px] text-gray-500 mb-3">
            <Move className="w-3 h-3" />
            {/* On touch the canvas drag is off (Preview3DStage), so promising it
                would be a lie — the arrows and the slider are the whole story. */}
            {coarse ? 'כווננו עם החצים ועם סרגל הגודל' : 'גררו את העיצוב על הבגד, או כווננו כאן'}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {/* Arrow pad. dir=ltr so the RIGHT-pointing arrow sits on the right
                of the screen inside this RTL page — the arrows are mapped to
                screen direction, and their layout must agree. */}
            <div dir="ltr" className="grid grid-cols-3 gap-1 shrink-0">
              <span />
              <button onClick={() => nudge(0, NUDGE)} aria-label="הזזה למעלה" className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 flex items-center justify-center"><ArrowUp className="w-4 h-4" /></button>
              <span />
              <button onClick={() => nudge(-NUDGE, 0)} aria-label="הזזה שמאלה" className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
              <span />
              <button onClick={() => nudge(NUDGE, 0)} aria-label="הזזה ימינה" className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 flex items-center justify-center"><ArrowRight className="w-4 h-4" /></button>
              <span />
              <button onClick={() => nudge(0, -NUDGE)} aria-label="הזזה למטה" className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 flex items-center justify-center"><ArrowDown className="w-4 h-4" /></button>
              <span />
            </div>

            <div className="flex-1 min-w-[170px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-600">גודל</span>
                <span dir="ltr" className="text-[11px] font-mono text-gray-500">{sizeUi.toFixed(2)}×</span>
              </div>
              {/* onChange fires on EVERY step of the drag (React maps it to the
                  native `input` event) and each committed step is a full decal
                  reprojection — so it only drives the imperative live preview.
                  Release commits: pointerup for the mouse/finger, keyup for the
                  arrow keys, which move a focused range with no pointer event. */}
              <input
                type="range" min={0.3} max={2} step={0.05} value={sizeUi}
                aria-label="גודל העיצוב"
                onChange={e => {
                  const v = Number(e.target.value)
                  setSizeUi(v)
                  previewRef.current?.({ ...(transforms[editArea] ?? DEFAULT_TRANSFORM), scale: v })
                }}
                onPointerUp={e => commitSize(Number((e.target as HTMLInputElement).value))}
                onKeyUp={e => commitSize(Number((e.target as HTMLInputElement).value))}
                className="w-full accent-yellow-500 cursor-pointer"
              />
              <button onClick={resetArea}
                className="mt-2 w-full h-8 rounded-md border border-gray-300 bg-white text-[11px] font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
                <RotateCcw className="w-3 h-3" />
                אפס
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400">בחרו אזור כדי להזיז ולשנות את גודל העיצוב</p>
      )}
    </div>
  ) : null

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
                // Artwork present: a fresh File, or (edit mode) the sketch's
                // already-stored https URL. Either way the card reads "filled".
                const has = !!previews[area.id]
                const required = !has && !!editing?.swept && editing.requiredAreas.includes(area.id)
                return (
                  <div key={area.id} className={`rounded-xl border-2 ${has ? 'border-green-300 bg-green-50' : required ? 'border-dashed border-amber-400 bg-amber-50/50' : 'border-dashed border-gray-300'} p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">{area.name}</span>
                      {has && (
                        <button onClick={() => {
                          setFiles(prev => { const u = { ...prev }; delete u[area.id]; return u })
                          setOriginals(prev => { const u = { ...prev }; delete u[area.id]; return u })
                          setExisting(prev => { const u = { ...prev }; delete u[area.id]; return u })
                          // The adjustment belongs to the file that just left.
                          setTransforms(prev => { const u = { ...prev }; delete u[area.id]; return u })
                          if (editArea === area.id) setEditArea(null)
                          setShareUrl(null)
                        }}
                          className="text-red-400 hover:text-red-600" aria-label={`הסרת קובץ מ${area.name}`}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <label className="cursor-pointer block">
                      {has ? (
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
                          <span className="text-[11px]">{required ? 'נדרשת העלאה מחדש' : 'העלאת קובץ'}</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) {
                            setFiles(prev => ({ ...prev, [area.id]: f }))
                            setOriginals(prev => { const u = { ...prev }; delete u[area.id]; return u })
                            setShareUrl(null)
                            // Swapping the file is the fix for most of these.
                            setErrorMsg(null)
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
            {editing && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 space-y-2">
                <div className="flex items-start gap-2">
                  <Pencil className="w-4 h-4 shrink-0 mt-px" />
                  <span><b>עריכת סקיצה קיימת</b> — השמירה תעדכן את אותו קישור שכבר נשלח ללקוח.</span>
                </div>
                {editing.swept && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    <span>הקבצים נמחקו — עריכה מחייבת העלאה מחדש של כל האזורים.</span>
                  </div>
                )}
                {editing.swept && editing.sweptPreview && (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editing.sweptPreview} alt="הסקיצה כפי שנשלחה"
                      className="w-20 h-20 rounded-lg border border-blue-200 object-cover bg-white" />
                    <span className="text-[11px] text-blue-700">כך הסקיצה נראתה — לייחוס בזמן ההעלאה מחדש</span>
                  </div>
                )}
              </div>
            )}
            <Input dir="ltr" inputMode="tel" placeholder="טלפון הלקוח (לא חובה) 050-1234567" value={phone} onChange={e => setPhone(e.target.value)} className="text-left" />
            <Input placeholder='שם לזיהוי בהיסטוריה (לא חובה) — למשל "יוסי — חולצות למסיבה"' value={label} onChange={e => setLabel(e.target.value)} />
            {!shareUrl ? (
              <>
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {missing.length > 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <Info className="w-4 h-4 shrink-0 mt-px" />
                    <span>{editing ? 'כדי לעדכן את הסקיצה' : 'כדי ליצור סקיצה'}: {missing.join(' ו')}</span>
                  </div>
                )}
                {editing ? (
                  <div className="space-y-2">
                    <Button onClick={() => handleSave('update')} disabled={!canCreate} className="w-full gradient-yellow text-white font-bold h-11 disabled:opacity-50">
                      {creating
                        ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />שומר את העדכון...</span>
                        : missing.length > 0 ? `${missing.join(' ו')} כדי להמשיך` : 'עדכן סקיצה — אותו קישור 🎨'}
                    </Button>
                    <Button variant="outline" onClick={() => handleSave('duplicate')} disabled={!canCreate} className="w-full h-10 text-sm">
                      <Copy className="w-4 h-4 ml-1" />שכפל כסקיצה חדשה (קישור חדש)
                    </Button>
                    <Button variant="outline" onClick={resetAll} disabled={creating} className="w-full h-9 text-xs text-gray-500">
                      <X className="w-3.5 h-3.5 ml-1" />ביטול עריכה — סקיצה חדשה מאפס
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => handleSave('create')} disabled={!canCreate} className="w-full gradient-yellow text-white font-bold h-11 disabled:opacity-50">
                    {creating
                      ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />מעלה קבצים ויוצר סקיצה...</span>
                      : missing.length > 0 ? `${missing.join(' ו')} כדי להמשיך` : 'צור סקיצה 🎨'}
                  </Button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {previewFailed && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    <span>הסקיצה נשמרה, אבל צילום התצוגה לוואטסאפ נכשל — הקישור יציג את הלוגו במקום הסקיצה. רעננו את העמוד ושמרו שוב כדי לנסות שנית (פרטים בקונסול).</span>
                  </div>
                )}
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
            {arrangeEl}
          </div>
        </div>
      </div>

      {/* ── History ── */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-sm">סקיצות אחרונות</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">פתיחה לעריכה שומרת על אותו קישור אצל הלקוח — מעדכנים ושולחים שוב</p>
        {!historyError && history.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none py-1.5 text-xs font-medium text-gray-700">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={bulkDeleting}
                  className="w-[18px] h-[18px] accent-red-600" />
                בחר הכל
              </label>
              {selected.size > 0 && (
                <>
                  <span className="text-xs font-bold text-gray-700">נבחרו {selected.size}</span>
                  {!confirmBulk && (
                    <button onClick={() => { setBulkResult(null); setConfirmBulk(true) }}
                      className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-red-600 text-xs font-bold text-white hover:bg-red-700">
                      <Trash2 className="w-3.5 h-3.5" />
                      מחק את הנבחרות ({selected.size})
                    </button>
                  )}
                </>
              )}
              {bulkResult && <span className="text-xs font-bold text-amber-700">{bulkResult}</span>}
            </div>
            {confirmBulk && selected.size > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5">
                <span className="text-xs font-bold text-red-800">
                  {selected.size === 1
                    ? 'למחוק את הסקיצה שנבחרה? הקישור שנשלח ללקוח יפסיק לעבוד'
                    : `למחוק ${selected.size} סקיצות? הקישורים שנשלחו ללקוחות יפסיקו לעבוד`}
                </span>
                <button onClick={handleBulkDelete} disabled={bulkDeleting || deletingRow !== null}
                  className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-red-600 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                  {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  מחק סופית
                </button>
                <button onClick={() => setConfirmBulk(false)} disabled={bulkDeleting}
                  className="h-8 px-2.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  ביטול
                </button>
              </div>
            )}
          </div>
        )}
        {historyError ? (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>טעינת ההיסטוריה נכשלה</span>
            <button onClick={() => loadHistory(null)} className="underline font-medium">נסו שוב</button>
          </div>
        ) : history.length === 0 && !historyLoading ? (
          <p className="text-sm text-gray-400">עוד אין סקיצות — הראשונה שתיצרו תופיע כאן</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map(item => {
              const swept = item.designsDeleted === true
              const when = formatWhen(item.updatedAt ?? item.createdAt)
              const details = [
                getProductLabel(item.productType),
                item.fabricType ? getTypeLabel(item.fabricType) : null,
                getColorLabel(item.color, item.productType),
              ].filter(Boolean).join(' · ')
              return (
                <div key={item.id}
                  className={`py-3 flex flex-wrap items-center gap-3 ${editing?.id === item.id ? 'bg-yellow-50/70 -mx-2 px-2 rounded-lg' : ''}`}>
                  {/* Full-height label = a 36×64px tap target at 390px, not an 18px box. */}
                  <label className="flex items-center justify-center h-16 w-9 shrink-0 cursor-pointer">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)}
                      disabled={bulkDeleting} aria-label={`בחירת הסקיצה ${item.label || details}`}
                      className="w-[18px] h-[18px] accent-red-600" />
                  </label>
                  <HistoryThumb src={isSketchPreviewUrl(item.previewUrl) ? item.previewUrl : null} alt={details} />
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-sm font-bold text-gray-800 truncate">{item.label || details}</div>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2">
                      {item.label && <span>{details}</span>}
                      {when && <span>{when}{item.updatedAt ? ' (עודכן)' : ''}</span>}
                      {item.phone && <span dir="ltr">{item.phone}</span>}
                    </div>
                    {swept && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        הקבצים נמחקו — עריכה מחייבת העלאה מחדש
                      </div>
                    )}
                  </div>
                  {confirmDelete === item.id ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5">
                      <span className="text-xs font-bold text-red-800">למחוק את הסקיצה? הקישור שנשלח ללקוח יפסיק לעבוד</span>
                      <button onClick={() => handleDelete(item)} disabled={deletingRow !== null}
                        className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-red-600 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                        {deletingRow === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        מחק סופית
                      </button>
                      <button onClick={() => setConfirmDelete(null)} disabled={deletingRow === item.id}
                        className="h-8 px-2.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                        ביטול
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadForEdit(item)}
                        className="flex items-center gap-1 h-8 px-2.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:border-yellow-400 hover:bg-yellow-50">
                        <Pencil className="w-3.5 h-3.5" />פתח לעריכה
                      </button>
                      <button onClick={() => copyRowLink(item)}
                        className="flex items-center gap-1 h-8 px-2.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
                        {copiedRow === item.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedRow === item.id ? 'הועתק' : 'העתק קישור'}
                      </button>
                      <button onClick={() => openRowWhatsApp(item)}
                        className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-[#25D366] text-xs font-bold text-white hover:opacity-90">
                        <Share2 className="w-3.5 h-3.5" />וואטסאפ
                      </button>
                      <button onClick={() => setConfirmDelete(item.id)}
                        aria-label={`מחיקת הסקיצה ${item.label || details}`}
                        className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-red-500 hover:border-red-300 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {historyLoading && (
          <div className="flex items-center justify-center py-4 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!historyLoading && historyCursor && (
          <Button variant="outline" onClick={() => loadHistory(historyCursor)} className="w-full h-9 mt-3 text-xs text-gray-600">
            טען עוד
          </Button>
        )}
      </div>
    </div>
  )
}
