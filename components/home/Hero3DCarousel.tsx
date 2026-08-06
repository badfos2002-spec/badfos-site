'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Bounds, Environment, Lightformer, useGLTF } from '@react-three/drei'
import Tshirt3DModel, { ShirtVariant } from '@/components/designer/three/Tshirt3DModel'

/**
 * Every product in the rotation. Designs live in /assets/hero-designs/<key>.png —
 * a missing file simply renders the plain garment (the decal loader skips
 * silently), so artwork can be dropped in without code changes.
 * Ordered light→heavy so the first paint is instant while the rest preload.
 */
const HERO_PRODUCTS: {
  key: string
  label: string
  variant: ShirtVariant
  modelUrl: string
  colorHex: string
  designs: { area: string; url: string }[]
}[] = [
  { key: 'meshcap', label: 'כובע רשת', variant: 'meshcap', modelUrl: '/models/meshcap-web.glb', colorHex: '#1E3A8A', designs: [{ area: 'center', url: '/assets/hero-designs/meshcap.png' }] },
  { key: 'baby', label: 'בגד גוף לתינוק', variant: 'baby', modelUrl: '/models/baby-web.glb', colorHex: '#BFDBFE', designs: [{ area: 'front_full', url: '/assets/hero-designs/baby.png' }] },
  { key: 'apron', label: 'סינר', variant: 'apron', modelUrl: '/models/apron-web.glb', colorHex: '#1E3A8A', designs: [{ area: 'center', url: '/assets/hero-designs/apron.png' }] },
  { key: 'tote', label: 'תיק קנבס', variant: 'totevolume', modelUrl: '/models/tote-volume-web.glb', colorHex: '#E4D9C3', designs: [{ area: 'front_full', url: '/assets/hero-designs/tote.png' }] },
  { key: 'dsbag', label: 'תיק שרוכים', variant: 'dsbag', modelUrl: '/models/dsbag-web.glb', colorHex: '#111111', designs: [{ area: 'front_full', url: '/assets/hero-designs/dsbag.png' }] },
  { key: 'buff', label: 'באף', variant: 'buff', modelUrl: '/models/buff-web.glb', colorHex: '#0F172A', designs: [{ area: 'center', url: '/assets/hero-designs/buff.png' }] },
  { key: 'vest', label: 'וסט זוהר', variant: 'vest', modelUrl: '/models/vest-web.glb', colorHex: '#CCFF00', designs: [{ area: 'back', url: '/assets/hero-designs/vest.png' }] },
  { key: 'hoodie', label: 'קפוצ׳ון', variant: 'hoodie', modelUrl: '/models/hoodie-web.glb', colorHex: '#6B7280', designs: [{ area: 'front_full', url: '/assets/hero-designs/hoodie.png' }] },
  { key: 'tshirt', label: 'חולצה', variant: 'tshirt', modelUrl: '/models/tshirt-web.glb', colorHex: '#FFFFFF', designs: [{ area: 'front_full', url: '/assets/hero-designs/tshirt.png' }] },
]

const SLIDE_MS = 3500
const FADE_MS = 280
const RESUME_AFTER_DRAG_MS = 5000

/**
 * Continuous slow turntable; a horizontal drag takes over and auto-spin
 * resumes a few seconds after release. Vertical swipes keep scrolling the page.
 */
function AutoTurntable({ spinning, onDragStart, onDragEnd, children }: {
  spinning: boolean
  onDragStart: () => void
  onDragEnd: () => void
  children: React.ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const target = useRef(0)
  const dragging = useRef(false)
  const { gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = 'pan-y'
    el.style.cursor = 'grab'
    let lastX = 0
    const down = (e: PointerEvent) => {
      dragging.current = true
      lastX = e.clientX
      el.style.cursor = 'grabbing'
      onDragStart()
    }
    const move = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      target.current += dx * 0.01
    }
    const up = () => {
      if (!dragging.current) return
      dragging.current = false
      el.style.cursor = 'grab'
      onDragEnd()
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl, onDragStart, onDragEnd])

  useFrame((_, delta) => {
    if (spinning && !dragging.current) target.current += delta * 0.4
    const g = group.current
    if (g) g.rotation.y += (target.current - g.rotation.y) * 0.15
  })

  return <group ref={group}>{children}</group>
}

export default function Hero3DCarousel() {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)
  const [inView, setInView] = useState(true)
  const [userHold, setUserHold] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Preload the whole fleet in background order (list is light→heavy).
  useEffect(() => {
    const t = setTimeout(() => {
      HERO_PRODUCTS.forEach(p => useGLTF.preload(p.modelUrl))
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  // Pause everything while the hero is off-screen or the tab is hidden.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const advance = useCallback((to?: number) => {
    setFading(true)
    setTimeout(() => {
      setIdx(prev => to ?? (prev + 1) % HERO_PRODUCTS.length)
      setFading(false)
    }, FADE_MS)
  }, [])

  // Auto-advance timer.
  useEffect(() => {
    if (reducedMotion.current || !inView || userHold) return
    const id = setInterval(() => advance(), SLIDE_MS)
    return () => clearInterval(id)
  }, [inView, userHold, advance])

  const onDragStart = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    setUserHold(true)
  }, [])
  const onDragEnd = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => setUserHold(false), RESUME_AFTER_DRAG_MS)
  }, [])
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current) }, [])

  const p = HERO_PRODUCTS[idx]

  return (
    <div
      ref={containerRef}
      className="w-full md:w-fit md:mx-auto bg-white p-3 rounded-[2.5rem] relative"
      style={{ boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="relative w-full md:w-[550px] aspect-square mx-auto overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#fffdf5] to-[#fef3c7]">
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
        >
          <Canvas
            dpr={[1, 2]}
            frameloop={inView ? 'always' : 'never'}
            camera={{ position: [0, 0, 3.2], fov: 30 }}
            gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.22} />
            <directionalLight position={[4, 6, 5]} intensity={1.45} />
            <directionalLight position={[-3, 4, -5]} intensity={0.8} />
            <Suspense fallback={null}>
              <Environment resolution={256}>
                <Lightformer intensity={2.6} rotation-x={Math.PI / 2} position={[0, 5, -2]} scale={[10, 5, 1]} />
                <Lightformer intensity={1.9} position={[-4, 1, 4]} scale={[3, 5, 1]} />
                <Lightformer intensity={1.9} position={[4, 1, 4]} scale={[3, 5, 1]} />
                <Lightformer intensity={1.0} position={[0, -3, 3]} scale={[8, 3, 1]} color="#ffffff" />
              </Environment>
              <Bounds key={p.key} fit clip margin={p.variant === 'cap' || p.variant === 'meshcap' ? 1.15 : 1.0}>
                <AutoTurntable spinning={!reducedMotion.current} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                  <Tshirt3DModel
                    color={p.colorHex}
                    designs={p.designs}
                    variant={p.variant}
                    modelUrl={p.modelUrl}
                  />
                </AutoTurntable>
              </Bounds>
              <ContactShadows position={[0, -1.05, 0]} opacity={0.4} scale={6} blur={2.6} far={2} />
            </Suspense>
          </Canvas>
        </div>

        {/* Product label */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <span
            key={p.key}
            className="inline-block bg-white/85 backdrop-blur-sm text-[#854d0e] text-sm font-bold px-4 py-1.5 rounded-full border border-[#fde047] shadow-sm"
          >
            {p.label}
          </span>
        </div>

        {/* Drag hint */}
        <div className="absolute bottom-8 right-0 left-0 z-20 flex justify-center pointer-events-none">
          <span className="text-[11px] font-semibold text-[#854d0e]/70 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full">
            360° · גררו לסיבוב
          </span>
        </div>
      </div>

      {/* Product dots */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-20">
        {HERO_PRODUCTS.map((prod, i) => (
          <button
            key={prod.key}
            onClick={() => { if (i !== idx && !fading) advance(i) }}
            className={`transition-all duration-300 rounded-full ${
              i === idx ? 'bg-[#f59e0b] w-2.5 h-2.5 scale-110 shadow-sm' : 'bg-[#f59e0b]/30 w-2.5 h-2.5'
            }`}
            aria-label={`הצגת ${prod.label}`}
          />
        ))}
      </div>
    </div>
  )
}
