'use client'

/**
 * TEMPORARY verification harness — deleted before the sketch-transform feature
 * ships (plan Task 8 Step 6).
 *
 * `/admin/sketches` cannot be opened locally: the admin gate is a Firebase
 * Google OAuth popup and `.env.local` carries no `NEXT_PUBLIC_FIREBASE_*` keys.
 * This route mounts `Preview3DStage` with exactly the props the sketch page
 * passes, without auth, Firebase or Firestore, so a browser driver can verify
 * the 3D behaviour. It renders nothing in production.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  FABRIC_TYPES, TSHIRT_DESIGN_AREAS,
  SWEATSHIRT_TYPES, SWEATSHIRT_DESIGN_AREAS, SWEATSHIRT_AREA_FILTER,
  CAP_TYPES, CAP_DESIGN_AREAS, CAP_AREA_FILTER,
  TOTE_TYPES, TOTE_DESIGN_AREAS, TOTE_AREA_FILTER,
  BUFF_DESIGN_AREAS, APRON_DESIGN_AREAS, BABY_DESIGN_AREAS, VEST_DESIGN_AREAS,
  getModel3D,
} from '@/lib/constants'
import nextDynamic from 'next/dynamic'
import ThreeErrorBoundary from '@/components/designer/three/ThreeErrorBoundary'
import Preview3DLoading from '@/components/designer/three/Preview3DLoading'

const Preview3DStage = nextDynamic(() => import('@/components/designer/three/Preview3DStage'), {
  ssr: false,
  loading: () => <Preview3DLoading />,
})

type TypeDef = { id: string; name: string }
type AreaDef = { id: string; name: string }

interface ProductDef {
  id: string
  name: string
  types: readonly TypeDef[] | null
  areas: readonly AreaDef[]
  areaFilter?: Record<string, string[]>
}

// Same shape as the sketch page's PRODUCTS, minus colours (a raw hex input
// replaces the swatch list here).
const PRODUCTS: ProductDef[] = [
  { id: 'tshirt', name: 'חולצה', types: FABRIC_TYPES, areas: TSHIRT_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'sweatshirt', name: 'סווטשירט', types: SWEATSHIRT_TYPES, areas: SWEATSHIRT_DESIGN_AREAS as unknown as AreaDef[], areaFilter: SWEATSHIRT_AREA_FILTER },
  { id: 'cap', name: 'כובע', types: CAP_TYPES, areas: CAP_DESIGN_AREAS as unknown as AreaDef[], areaFilter: CAP_AREA_FILTER },
  { id: 'tote', name: 'תיק', types: TOTE_TYPES, areas: TOTE_DESIGN_AREAS as unknown as AreaDef[], areaFilter: TOTE_AREA_FILTER },
  { id: 'vest', name: 'וסט זוהר', types: null, areas: VEST_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'buff', name: 'באף', types: null, areas: BUFF_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'apron', name: 'סינר', types: null, areas: APRON_DESIGN_AREAS as unknown as AreaDef[] },
  { id: 'baby', name: 'בגד גוף', types: null, areas: BABY_DESIGN_AREAS as unknown as AreaDef[] },
]

// One flat `productId|typeId` list so a driver can switch variant in a single
// action. Derived from PRODUCTS — no second copy of the type ids.
const VARIANTS = PRODUCTS.flatMap(p =>
  p.types
    ? p.types.map(t => ({ value: `${p.id}|${t.id}`, label: `${p.name} — ${t.name}` }))
    : [{ value: `${p.id}|`, label: p.name }]
)

const SWATCHES = [
  { id: 'white', hex: '#FFFFFF' },
  { id: 'black', hex: '#111111' },
  { id: 'yellow', hex: '#FBBF24' },
  { id: 'navy', hex: '#1E3A8A' },
]

export default function Dev3DPage() {
  if (process.env.NODE_ENV === 'production') return null
  return <Dev3DHarness />
}

function Dev3DHarness() {
  const [selected, setSelected] = useState('tshirt|cotton')
  const [colorHex, setColorHex] = useState('#d1d5db')
  const [files, setFiles] = useState<Record<string, File>>({})
  const [areaId, setAreaId] = useState('front_full')

  const [productId, typeId] = selected.split('|')
  const product = PRODUCTS.find(p => p.id === productId)!

  const allowedAreas = useMemo(() => {
    const filter = product.areaFilter?.[typeId]
    if (!filter) return product.areas
    return product.areas.filter(a => filter.includes(a.id))
  }, [product, typeId])

  // The area select never holds a value the current product cannot print.
  const activeArea = allowedAreas.some(a => a.id === areaId) ? areaId : allowedAreas[0].id

  // Blob previews per area (revoked on change/unmount) — same as the sketch page.
  const previews = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [area, file] of Object.entries(files)) map[area] = URL.createObjectURL(file)
    return map
  }, [files])
  useEffect(() => {
    return () => { Object.values(previews).forEach(u => URL.revokeObjectURL(u)) }
  }, [previews])

  const selectVariant = (value: string) => {
    setSelected(value)
    setFiles({})
  }

  const m3d = getModel3D(productId, typeId || undefined)
  const designs = Object.entries(previews).map(([area, url]) => ({ area, url }))

  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 520, margin: '0 auto', fontSize: 14 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 12 }}>dev-3d — רתמת בדיקה (זמנית)</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select
          data-testid="variant-select"
          value={selected}
          onChange={e => selectVariant(e.target.value)}
          style={{ border: '1px solid #ccc', borderRadius: 6, padding: 4 }}
        >
          {VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>

        <select
          data-testid="area-select"
          value={activeArea}
          onChange={e => setAreaId(e.target.value)}
          style={{ border: '1px solid #ccc', borderRadius: 6, padding: 4 }}
        >
          {allowedAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <input
          data-testid="color-input"
          type="color"
          value={colorHex}
          onChange={e => setColorHex(e.target.value)}
        />
        {SWATCHES.map(s => (
          <button
            key={s.id}
            data-testid={`swatch-${s.id}`}
            onClick={() => setColorHex(s.hex)}
            aria-label={s.id}
            style={{ width: 24, height: 24, borderRadius: 12, border: '1px solid #ccc', background: s.hex }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          data-testid="file-input"
          type="file"
          accept="image/*"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) setFiles(prev => ({ ...prev, [activeArea]: f }))
            e.target.value = ''
          }}
        />
        <button
          data-testid="clear-designs"
          onClick={() => setFiles({})}
          style={{ border: '1px solid #ccc', borderRadius: 6, padding: '2px 8px' }}
        >
          נקה
        </button>
      </div>

      <div data-testid="state" style={{ marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }} dir="ltr">
        variant={m3d?.variant ?? 'none'} model={m3d?.url ?? 'none'} areas=[{designs.map(d => d.area).join(',')}] color={colorHex}
      </div>

      {m3d ? (
        <ThreeErrorBoundary fallback={
          <div data-testid="stage-fallback" style={{ aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: 16 }}>
            3D fallback
          </div>
        }>
          <div data-testid="stage" style={{ position: 'relative', width: '100%', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden' }}>
            <Preview3DStage
              warmAll
              noHint
              colorHex={colorHex}
              designs={designs}
              showGuides
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              variant={m3d.variant as any}
              modelUrl={m3d.url}
            />
          </div>
        </ThreeErrorBoundary>
      ) : (
        <div data-testid="stage-none" style={{ aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: 16 }}>
          אין מודל תלת-ממד
        </div>
      )}
    </div>
  )
}
