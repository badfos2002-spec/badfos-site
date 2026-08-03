'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, Bounds, Environment, Lightformer } from '@react-three/drei';
import Tshirt3DModel, { ShirtDesign } from './Tshirt3DModel';

// Camera position sets the viewing angle; Bounds auto-fits the distance.
const CAMERA = { position: [0, 0, 3.2] as [number, number, number], fov: 30 };

interface Preview3DStageProps {
  colorHex: string;
  designs: ShirtDesign[];
  showGuides?: boolean;
  activeArea?: string;
}

/**
 * Turntable: rotates the shirt around its vertical axis from HORIZONTAL drags
 * only. The canvas keeps `touch-action: pan-y`, so a VERTICAL swipe scrolls the
 * page normally instead of getting trapped by the 3D view (the old OrbitControls
 * blocked page scroll on mobile). Camera stays fixed — only the shirt spins.
 */
function Turntable({
  focusArea,
  onFirstInteract,
  children,
}: {
  focusArea?: string;
  onFirstInteract?: () => void;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const target = useRef(0);
  const { gl } = useThree();

  // Clicking a design area spins the shirt to face it (back = 180°, everything
  // else = front). Rotate the SHORT way around from wherever it currently is.
  useEffect(() => {
    if (!focusArea) return;
    const angle = focusArea === 'back' ? Math.PI : 0;
    const twoPi = Math.PI * 2;
    const cur = target.current;
    const diff = ((((angle - cur + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
    target.current = cur + diff;
  }, [focusArea]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.style.cursor = 'grabbing';
      onFirstInteract?.();
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      target.current += dx * 0.01;
    };
    const up = () => {
      dragging = false;
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame(() => {
    const g = group.current;
    if (g) g.rotation.y += (target.current - g.rotation.y) * 0.15;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Reusable 3D shirt stage: transparent Canvas + procedural studio lighting,
 * turntable rotation, and the shirt model, over the branded background.
 */
export default function Preview3DStage({ colorHex, designs, showGuides, activeArea }: Preview3DStageProps) {
  const [interacted, setInteracted] = useState(false);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'url(/assets/designer-3d-bg.png) center / cover no-repeat',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMERA.position, fov: CAMERA.fov }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 6, 5]} intensity={1.15} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        {/* Rim light from behind — separates a white shirt from the light bg
            and lets a black shirt's edges/folds catch light. */}
        <directionalLight position={[-3, 4, -5]} intensity={0.8} />
        <Suspense fallback={null}>
          {/* Procedural studio environment (no external HDRI → CSP-safe). */}
          <Environment resolution={256}>
            <Lightformer intensity={2.6} rotation-x={Math.PI / 2} position={[0, 5, -2]} scale={[10, 5, 1]} />
            <Lightformer intensity={1.9} position={[-4, 1, 4]} scale={[3, 5, 1]} />
            <Lightformer intensity={1.9} position={[4, 1, 4]} scale={[3, 5, 1]} />
            <Lightformer intensity={1.0} position={[0, -3, 3]} scale={[8, 3, 1]} color="#ffffff" />
          </Environment>
          <Bounds fit clip observe margin={1.0}>
            <Turntable focusArea={activeArea} onFirstInteract={() => setInteracted(true)}>
              <Tshirt3DModel color={colorHex} designs={designs} showGuides={showGuides} activeArea={activeArea} />
            </Turntable>
          </Bounds>
          <ContactShadows position={[0, -1.05, 0]} opacity={0.45} scale={6} blur={2.6} far={2} />
        </Suspense>
      </Canvas>

      {/* 360° badge — centered on the branded background, top of the stage. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 4,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/icon-360.png" alt="" width={64} height={64} style={{ display: 'block' }} />
      </div>

      {/* "It's 3D — drag to rotate" hint centered over the WHOLE shirt area.
          pointerEvents:none so the drag reaches the canvas; fades on 1st touch. */}
      <style>{`@keyframes t3dDrag{0%,100%{transform:translateX(-11px)}50%{transform:translateX(11px)}}`}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 3,
          opacity: interacted ? 0 : 1,
          transition: 'opacity 0.6s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(20,20,20,0.55)',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: 18,
            boxShadow: '0 4px 18px rgba(0,0,0,0.30)',
            fontFamily: '"Assistant","Rubik",system-ui,sans-serif',
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFC32E"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ animation: 't3dDrag 1.6s ease-in-out infinite' }}
          >
            <path d="M8 7 L4 12 L8 17" />
            <path d="M16 7 L20 12 L16 17" />
            <path d="M4 12 H20" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, textAlign: 'right' }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>גררו לסיבוב</span>
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>תצוגת 360°</span>
          </div>
        </div>
      </div>
    </div>
  );
}
