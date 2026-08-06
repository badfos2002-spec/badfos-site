'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei'
import Tshirt3DModel, { ShirtVariant } from '@/components/designer/three/Tshirt3DModel'

/**
 * Every product on the ring. Designs live in /assets/hero-designs/<key>.png —
 * a missing file simply renders the plain garment (the decal loader skips
 * silently), so artwork can be dropped in without code changes.
 */
const HERO_PRODUCTS: {
  key: string
  label: string
  variant: ShirtVariant
  modelUrl: string
  colorHex: string
  designs: { area: string; url: string }[]
}[] = [
  { key: 'tshirt', label: 'חולצה', variant: 'tshirt', modelUrl: '/models/tshirt-web.glb', colorHex: '#FFFFFF', designs: [{ area: 'front_full', url: '/assets/hero-designs/tshirt.png' }] },
  { key: 'meshcap', label: 'כובע רשת', variant: 'meshcap', modelUrl: '/models/meshcap-web.glb', colorHex: '#1E3A8A', designs: [{ area: 'center', url: '/assets/hero-designs/meshcap.png' }] },
  { key: 'baby', label: 'בגד גוף לתינוק', variant: 'baby', modelUrl: '/models/baby-web.glb', colorHex: '#BFDBFE', designs: [{ area: 'front_full', url: '/assets/hero-designs/baby.png' }] },
  { key: 'apron', label: 'סינר', variant: 'apron', modelUrl: '/models/apron-web.glb', colorHex: '#1E3A8A', designs: [{ area: 'center', url: '/assets/hero-designs/apron.png' }] },
  { key: 'tote', label: 'תיק קנבס', variant: 'totevolume', modelUrl: '/models/tote-volume-web.glb', colorHex: '#E4D9C3', designs: [{ area: 'front_full', url: '/assets/hero-designs/tote.png' }] },
  { key: 'dsbag', label: 'תיק שרוכים', variant: 'dsbag', modelUrl: '/models/dsbag-web.glb', colorHex: '#111111', designs: [{ area: 'front_full', url: '/assets/hero-designs/dsbag.png' }] },
  { key: 'buff', label: 'באף', variant: 'buff', modelUrl: '/models/buff-web.glb', colorHex: '#0F172A', designs: [{ area: 'center', url: '/assets/hero-designs/buff.png' }] },
  { key: 'vest', label: 'וסט זוהר', variant: 'vest', modelUrl: '/models/vest-web.glb', colorHex: '#CCFF00', designs: [{ area: 'back', url: '/assets/hero-designs/vest.png' }] },
  { key: 'hoodie', label: 'קפוצ׳ון', variant: 'hoodie', modelUrl: '/models/hoodie-web.glb', colorHex: '#6B7280', designs: [{ area: 'front_full', url: '/assets/hero-designs/hoodie.png' }] },
]

const N = HERO_PRODUCTS.length
const STEP = (Math.PI * 2) / N
const RADIUS = 3.5
const REV_SECONDS = 26 // one full ring revolution
const RESUME_AFTER_DRAG_MS = 4000
// Depth-based presence: the front product is full-size, the ones at the back
// shrink — classic 3D carousel reading, and it keeps the ring uncluttered.
const SCALE_FRONT = 1.0
const SCALE_BACK = 0.52

/** Shared mutable ring state — parent (dots) and the ring both steer it. */
type RingCtl = { target: number; auto: boolean }

/**
 * The spinning product ring. Horizontal drags rotate the whole carousel;
 * auto-spin resumes a few seconds after release. Each product faces outward,
 * so whichever reaches the front looks straight at the visitor.
 */
function Ring({ ctl, onFrontChange, spinning }: {
  ctl: React.MutableRefObject<RingCtl>
  onFrontChange: (i: number) => void
  spinning: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const dragging = useRef(false)
  const lastFront = useRef(-1)
  const { gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = 'pan-y'
    el.style.cursor = 'grab'
    let lastX = 0
    let resumeTimer: ReturnType<typeof setTimeout> | null = null
    const down = (e: PointerEvent) => {
      dragging.current = true
      lastX = e.clientX
      el.style.cursor = 'grabbing'
      ctl.current.auto = false
      if (resumeTimer) clearTimeout(resumeTimer)
    }
    const move = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      ctl.current.target += dx * 0.005
    }
    const up = () => {
      if (!dragging.current) return
      dragging.current = false
      el.style.cursor = 'grab'
      if (resumeTimer) clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => { ctl.current.auto = true }, RESUME_AFTER_DRAG_MS)
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      if (resumeTimer) clearTimeout(resumeTimer)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl, ctl])

  const worldPos = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (spinning && ctl.current.auto && !dragging.current) {
      ctl.current.target -= delta * ((Math.PI * 2) / REV_SECONDS)
    }
    g.rotation.y += (ctl.current.target - g.rotation.y) * 0.08
    // Depth-based scale: items grow toward the camera, shrink at the back —
    // and every item's FEET stay on one common floor (models are ~±1 units
    // around their centre), so the ring reads grounded, not floating.
    for (const child of g.children) {
      child.getWorldPosition(worldPos.current)
      const t = (worldPos.current.z + RADIUS) / (RADIUS * 2) // 0 back → 1 front
      const s = SCALE_BACK + (SCALE_FRONT - SCALE_BACK) * t
      child.scale.setScalar(s)
      child.position.y = s - 1.05
    }
    // Which product is closest to the front right now?
    const idx = ((Math.round(-g.rotation.y / STEP) % N) + N) % N
    if (idx !== lastFront.current) {
      lastFront.current = idx
      onFrontChange(idx)
    }
  })

  return (
    <group ref={group}>
      {HERO_PRODUCTS.map((p, i) => {
        const a = i * STEP
        return (
          <group key={p.key} position={[Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS]} rotation={[0, a, 0]}>
            <Suspense fallback={null}>
              <Tshirt3DModel color={p.colorHex} designs={p.designs} variant={p.variant} modelUrl={p.modelUrl} />
            </Suspense>
          </group>
        )
      })}
    </group>
  )
}

export default function Hero3DCarousel() {
  const [front, setFront] = useState(0)
  const [inView, setInView] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const ctl = useRef<RingCtl>({ target: 0, auto: true })
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Everything is on the ring — preload the whole fleet right away.
  useEffect(() => {
    HERO_PRODUCTS.forEach(p => useGLTF.preload(p.modelUrl))
  }, [])

  // Pause rendering while the hero is off-screen.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Dot click: rotate the ring the SHORT way so product i faces the camera.
  const goTo = useCallback((i: number) => {
    const desired = -i * STEP
    const twoPi = Math.PI * 2
    const cur = ctl.current.target
    const diff = ((((desired - cur) % twoPi) + twoPi + Math.PI) % twoPi) - Math.PI
    ctl.current.target = cur + diff
    ctl.current.auto = false
    setTimeout(() => { ctl.current.auto = true }, RESUME_AFTER_DRAG_MS)
  }, [])

  const p = HERO_PRODUCTS[front]

  return (
    <div ref={containerRef} className="relative w-full mx-auto max-w-[720px]">
      {/* Free-floating stage — no card, transparent canvas over the hero bg */}
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
            <Ring ctl={ctl} onFrontChange={setFront} spinning={!reducedMotion.current} />
            <ContactShadows position={[0, -1.1, 0]} opacity={0.32} scale={13} blur={2.8} far={2.4} />
          </Suspense>
        </Canvas>

        {/* Front product label — floating chip */}
        <div className="absolute top-2 right-0 left-0 z-20 flex justify-center pointer-events-none">
          <span
            key={p.key}
            className="inline-block bg-white/85 backdrop-blur-sm text-[#854d0e] text-base font-bold px-5 py-1.5 rounded-full border border-[#fde047] shadow-sm"
          >
            {p.label}
          </span>
        </div>

        {/* Drag hint */}
        <div className="absolute bottom-1 right-0 left-0 z-20 flex justify-center pointer-events-none">
          <span className="text-[11px] font-semibold text-[#854d0e]/70 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full">
            360° · גררו לסיבוב
          </span>
        </div>
      </div>

      {/* Product dots */}
      <div className="mt-2 flex justify-center gap-1.5 z-20 relative">
        {HERO_PRODUCTS.map((prod, i) => (
          <button
            key={prod.key}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === front ? 'bg-[#f59e0b] w-2.5 h-2.5 scale-110 shadow-sm' : 'bg-[#f59e0b]/30 w-2.5 h-2.5'
            }`}
            aria-label={`הצגת ${prod.label}`}
          />
        ))}
      </div>
    </div>
  )
}
