'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei'
import Tshirt3DModel, { ShirtVariant } from '@/components/designer/three/Tshirt3DModel'

/**
 * Every product on the ring. Each product owns an array of DESIGN SETS — while
 * the ring dwells on a product at the front, it cycles through its sets so the
 * artwork on the garment changes. Files live in /assets/hero-designs/; a missing
 * file just renders the plain garment (the decal loader skips silently), so
 * artwork can be dropped in later without any code change.
 *
 * To show several designs cycling on one product, add more inner arrays, e.g.
 *   designSets: [
 *     [{ area: 'front_full', url: '/assets/hero-designs/tshirt-1.png' }],
 *     [{ area: 'front_full', url: '/assets/hero-designs/tshirt-2.png' }],
 *   ]
 */
type Design = { area: string; url: string }
const one = (key: string, area: string): Design[][] => [[{ area, url: `/assets/hero-designs/${key}.png` }]]

const HERO_PRODUCTS: {
  key: string
  label: string
  variant: ShirtVariant
  modelUrl: string
  colorHex: string
  designSets: Design[][]
}[] = [
  // colorHex values are REAL catalog colours (from *_COLORS in lib/constants),
  // one distinct swatch per product so the ring reads varied but authentic.
  { key: 'tshirt',  label: 'חולצה',            variant: 'tshirt',     modelUrl: '/models/tshirt-web.glb',       colorHex: '#A81C22', designSets: one('tshirt', 'front_full') },   // אדום
  { key: 'meshcap', label: 'כובע רשת',          variant: 'meshcap',    modelUrl: '/models/meshcap-web.glb',      colorHex: '#1E40AF', designSets: one('meshcap', 'center') },       // כחול רויל
  { key: 'baby',    label: 'בגד גוף לתינוק',    variant: 'baby',       modelUrl: '/models/baby-web.glb',         colorHex: '#FBCFE8', designSets: one('baby', 'front_full') },      // ורוד
  { key: 'apron',   label: 'סינר',             variant: 'apron',      modelUrl: '/models/apron-web.glb',        colorHex: '#1E3A8A', designSets: one('apron', 'center') },         // נייבי
  { key: 'tote',    label: 'תיק קנבס',          variant: 'totevolume', modelUrl: '/models/tote-volume-web.glb',  colorHex: '#E4D9C3', designSets: one('tote', 'front_full') },      // בז׳
  { key: 'dsbag',   label: 'תיק שרוכים',        variant: 'dsbag',      modelUrl: '/models/dsbag-web.glb',        colorHex: '#000000', designSets: one('dsbag', 'front_full') },     // שחור
  { key: 'buff',    label: 'באף',              variant: 'buff',       modelUrl: '/models/buff-web.glb',         colorHex: '#06B6D4', designSets: one('buff', 'center') },          // טורקיז
  { key: 'vest',    label: 'וסט זוהר',          variant: 'vest',       modelUrl: '/models/vest-web.glb',         colorHex: '#CCFF00', designSets: one('vest', 'back') },            // צהוב זוהר
  { key: 'hoodie',  label: 'קפוצ׳ון',           variant: 'hoodie',     modelUrl: '/models/hoodie-web.glb',       colorHex: '#6E2A48', designSets: one('hoodie', 'front_full') },    // בורדו
]

const N = HERO_PRODUCTS.length
const STEP = (Math.PI * 2) / N
const RADIUS = 3.5
const SNAP_MS = 480       // sharp, quick rotation between products
const DWELL_MS = 2500     // hold on each product at the front
const DESIGN_MS = 850     // artwork swap interval while dwelling
const RESUME_AFTER_DRAG_MS = 3500
const SCALE_FRONT = 1.0
const SCALE_BACK = 0.52

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Snap ring: fast rotate → dwell → fast rotate. Reports the front index and a
 * design tick so the parent can swap the front product's artwork mid-dwell.
 * A horizontal drag takes over; auto-cycling resumes shortly after release.
 */
function Ring({ animate, front, tick, onState }: {
  animate: boolean
  front: number
  tick: number
  onState: (front: number, tick: number) => void
}) {
  const group = useRef<THREE.Group>(null)
  const { gl } = useThree()

  const angle = useRef(0)
  const idx = useRef(0)
  const phase = useRef<'dwell' | 'snap'>('dwell')
  const elapsed = useRef(0)
  const fromA = useRef(0)
  const toA = useRef(0)
  const dragging = useRef(false)
  const lastFront = useRef(-1)
  const lastTick = useRef(-1)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const worldPos = useRef(new THREE.Vector3())

  const report = (front: number, tick: number) => {
    if (front !== lastFront.current || tick !== lastTick.current) {
      lastFront.current = front
      lastTick.current = tick
      onState(front, tick)
    }
  }

  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = 'pan-y'
    el.style.cursor = 'grab'
    let lastX = 0
    const down = (e: PointerEvent) => {
      dragging.current = true
      lastX = e.clientX
      el.style.cursor = 'grabbing'
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
    const move = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      angle.current += dx * 0.008
    }
    const up = () => {
      if (!dragging.current) return
      dragging.current = false
      el.style.cursor = 'grab'
      // Settle to the nearest product, then resume the snap cycle.
      const nearest = Math.round(-angle.current / STEP)
      idx.current = ((nearest % N) + N) % N
      fromA.current = angle.current
      toA.current = -nearest * STEP
      phase.current = 'snap'
      elapsed.current = 0
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
      resumeTimer.current = setTimeout(() => {}, RESUME_AFTER_DRAG_MS)
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return

    if (!dragging.current && animate) {
      elapsed.current += delta * 1000
      if (phase.current === 'dwell') {
        report(idx.current, Math.floor(elapsed.current / DESIGN_MS))
        if (elapsed.current >= DWELL_MS) {
          fromA.current = angle.current
          toA.current = angle.current - STEP // always forward, one product
          idx.current = (idx.current + 1) % N
          phase.current = 'snap'
          elapsed.current = 0
        }
      } else {
        const t = Math.min(elapsed.current / SNAP_MS, 1)
        angle.current = fromA.current + (toA.current - fromA.current) * easeInOut(t)
        report(idx.current, 0)
        if (t >= 1) {
          angle.current = toA.current
          phase.current = 'dwell'
          elapsed.current = 0
        }
      }
    } else if (dragging.current) {
      const nearest = ((Math.round(-angle.current / STEP) % N) + N) % N
      report(nearest, 0)
    }

    g.rotation.y = angle.current

    // Depth-based scale + shared floor: front item large & grounded, rear small.
    for (const child of g.children) {
      child.getWorldPosition(worldPos.current)
      const t = (worldPos.current.z + RADIUS) / (RADIUS * 2)
      const s = SCALE_BACK + (SCALE_FRONT - SCALE_BACK) * t
      child.scale.setScalar(s)
      child.position.y = s - 1.05
    }
  })

  return (
    <group ref={group}>
      {HERO_PRODUCTS.map((p, i) => {
        // The front product cycles through its design sets; all others show
        // their first set. A product with a single set never changes.
        const sets = p.designSets
        const designs = i === front ? sets[tick % sets.length] : sets[0]
        const a = i * STEP
        return (
          <group key={p.key} position={[Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS]} rotation={[0, a, 0]}>
            <Suspense fallback={null}>
              <Tshirt3DModel color={p.colorHex} designs={designs} variant={p.variant} modelUrl={p.modelUrl} />
            </Suspense>
          </group>
        )
      })}
    </group>
  )
}

export default function Hero3DCarousel() {
  const [st, setSt] = useState({ front: 0, tick: 0 })
  const [inView, setInView] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    HERO_PRODUCTS.forEach(p => useGLTF.preload(p.modelUrl))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const onState = useCallback((front: number, tick: number) => setSt({ front, tick }), [])

  const p = HERO_PRODUCTS[st.front]

  return (
    <div ref={containerRef} className="relative w-full mx-auto max-w-[720px]">
      <div className="relative w-full aspect-[5/4]">
        <Canvas
          dpr={[1, 1.75]}
          frameloop={inView ? 'always' : 'never'}
          camera={{ position: [0, 1.0, 10.6], fov: 30 }}
          onCreated={({ camera }) => camera.lookAt(0, -0.2, 0)}
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.25} />
          <directionalLight position={[4, 6, 5]} intensity={1.35} />
          <directionalLight position={[-3, 4, -5]} intensity={0.7} />
          <Suspense fallback={null}>
            <Environment resolution={256}>
              <Lightformer intensity={2.4} rotation-x={Math.PI / 2} position={[0, 5, -2]} scale={[10, 5, 1]} />
              <Lightformer intensity={1.8} position={[-4, 1, 4]} scale={[3, 5, 1]} />
              <Lightformer intensity={1.8} position={[4, 1, 4]} scale={[3, 5, 1]} />
              <Lightformer intensity={0.9} position={[0, -3, 3]} scale={[8, 3, 1]} color="#ffffff" />
            </Environment>
            <Ring animate={!reducedMotion.current} front={st.front} tick={st.tick} onState={onState} />
            <ContactShadows position={[0, -1.1, 0]} opacity={0.32} scale={13} blur={2.8} far={2.4} />
          </Suspense>
        </Canvas>

        {/* Front product label */}
        <div className="absolute top-2 right-0 left-0 z-20 flex justify-center pointer-events-none">
          <span
            key={p.key}
            className="inline-block bg-white/85 backdrop-blur-sm text-[#854d0e] text-base font-bold px-5 py-1.5 rounded-full border border-[#fde047] shadow-sm"
          >
            {p.label}
          </span>
        </div>

        <div className="absolute bottom-1 right-0 left-0 z-20 flex justify-center pointer-events-none">
          <span className="text-[11px] font-semibold text-[#854d0e]/70 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full">
            360° · גררו לסיבוב
          </span>
        </div>
      </div>

      {/* Product dots */}
      <div className="mt-2 flex justify-center gap-1.5 relative z-20">
        {HERO_PRODUCTS.map((prod, i) => (
          <span
            key={prod.key}
            className={`transition-all duration-300 rounded-full ${
              i === st.front ? 'bg-[#f59e0b] w-2.5 h-2.5 scale-110 shadow-sm' : 'bg-[#f59e0b]/30 w-2.5 h-2.5'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}
