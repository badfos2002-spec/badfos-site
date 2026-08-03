'use client';

import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, Bounds, Environment, Lightformer } from '@react-three/drei';
import Tshirt3DModel, { ShirtDesign } from './Tshirt3DModel';

// Camera position sets the viewing angle; Bounds auto-fits the distance.
const CAMERA = { position: [0, 0, 3.2] as [number, number, number], fov: 30 };

interface Preview3DStageProps {
  colorHex: string;
  designs: ShirtDesign[];
}

/**
 * Turntable: rotates the shirt around its vertical axis from HORIZONTAL drags
 * only. The canvas keeps `touch-action: pan-y`, so a VERTICAL swipe scrolls the
 * page normally instead of getting trapped by the 3D view (the old OrbitControls
 * blocked page scroll on mobile). Camera stays fixed — only the shirt spins.
 */
function Turntable({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const target = useRef(0);
  const { gl } = useThree();

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
export default function Preview3DStage({ colorHex, designs }: Preview3DStageProps) {
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
            <Turntable>
              <Tshirt3DModel color={colorHex} designs={designs} />
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
          top: 18,
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
    </div>
  );
}
