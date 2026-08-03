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
import Tshirt3DModel from './Tshirt3DModel';

// Camera position sets the viewing angle; Bounds auto-fits the distance.
const CAMERA = { position: [0, 0, 3.2] as [number, number, number], fov: 30 };

interface Preview3DStageProps {
  colorHex: string;
  designUrl: string | null;
}

/**
 * Reusable 3D shirt stage: transparent Canvas + procedural studio lighting,
 * turntable OrbitControls, and the shirt model, over the branded background.
 * Extracted from Tshirt3DConfigurator so both the standalone prototype and the
 * stepped designer share the exact same scene. (Loader lives outside — the
 * caller renders it if needed.)
 */
export default function Preview3DStage({ colorHex, designUrl }: Preview3DStageProps) {
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
            <Tshirt3DModel color={colorHex} decalUrl={designUrl} />
          </Bounds>
          <ContactShadows position={[0, -1.05, 0]} opacity={0.45} scale={6} blur={2.6} far={2} />
        </Suspense>
        <OrbitControls
          makeDefault
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          enableDamping
          dampingFactor={0.1}
        />
      </Canvas>
    </div>
  );
}
