'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  ContactShadows,
  Bounds,
  Environment,
  Lightformer,
} from '@react-three/drei';
import Tshirt3DModel, { ShirtDesign } from './Tshirt3DModel';

// Camera position sets the viewing angle; Bounds auto-fits the distance.
const CAMERA = { position: [0, 0, 3.2] as [number, number, number], fov: 30 };

interface Preview3DStageProps {
  colorHex: string;
  designs: ShirtDesign[];
}

/**
 * Reusable 3D shirt stage: transparent Canvas + procedural studio lighting,
 * turntable OrbitControls, and the shirt model, over the branded background.
 * Extracted from Tshirt3DConfigurator so both the standalone prototype and the
 * stepped designer share the exact same scene. (Loader lives outside — the
 * caller renders it if needed.)
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
          {/* Procedural studio environment (no external HDRI → CSP-safe).
              Gives the fabric soft highlights + graded shading so colors
              read like real dyed cloth instead of a flat fill. */}
          <Environment resolution={256}>
            <Lightformer intensity={2.6} rotation-x={Math.PI / 2} position={[0, 5, -2]} scale={[10, 5, 1]} />
            <Lightformer intensity={1.9} position={[-4, 1, 4]} scale={[3, 5, 1]} />
            <Lightformer intensity={1.9} position={[4, 1, 4]} scale={[3, 5, 1]} />
            <Lightformer intensity={1.0} position={[0, -3, 3]} scale={[8, 3, 1]} color="#ffffff" />
          </Environment>
          <Bounds fit clip observe margin={1.0}>
            <Tshirt3DModel color={colorHex} designs={designs} />
          </Bounds>
          <ContactShadows position={[0, -1.05, 0]} opacity={0.45} scale={6} blur={2.6} far={2} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          enableDamping
          dampingFactor={0.1}
        />
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
        <svg viewBox="0 0 40 34" width="52" height="44" fill="none">
          <text x="19" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="800" fill="#141414">360°</text>
          <path d="M5 21 C5 25 11.3 28 19 28 C26.7 28 33 25 33 21" stroke="#141414" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M5 21 C5 17.7 9 15.2 14.5 14.1" stroke="#141414" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M33 21 C33 18.4 29.4 16.2 24.4 15.1" stroke="#141414" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M28 12 l5 2.8 -2.8 5" stroke="#141414" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
