'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, Bounds, Environment, Lightformer } from '@react-three/drei';
import Tshirt3DModel, { ShirtDesign, ShirtVariant, preloadAllModels } from './Tshirt3DModel';
import { DesignTransform } from './decalTransform';

// Camera position sets the viewing angle; Bounds auto-fits the distance.
const CAMERA = { position: [0, 0, 3.2] as [number, number, number], fov: 30 };

interface Preview3DStageProps {
  colorHex: string;
  designs: ShirtDesign[];
  showGuides?: boolean;
  activeArea?: string;
  variant?: ShirtVariant;
  modelUrl?: string;
  /** Warm ALL models into cache (designer pages, where types switch).
   *  Leave off on public share pages — they need only their one model. */
  warmAll?: boolean;
  /** Suppress the one-time "drag to rotate" hint overlay (admin sketch tool). */
  noHint?: boolean;
  /** The area being adjusted in the sketch tool: faces the camera, locks the
   *  turntable, and turns drags into design moves instead of rotation. */
  editArea?: string;
  onCommit?: (area: string, t: DesignTransform) => void;
}

/** Face `focusArea` the SHORT way around from `cur`. Shared by the focus effect
 *  and the edit-mode snap so the two can never drift apart. */
function shortWayTo(angle: number, cur: number): number {
  const twoPi = Math.PI * 2;
  return cur + (((((angle - cur + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI);
}

/**
 * Turntable: rotates the shirt around its vertical axis from HORIZONTAL drags
 * only. The canvas keeps `touch-action: pan-y`, so a VERTICAL swipe scrolls the
 * page normally instead of getting trapped by the 3D view (the old OrbitControls
 * blocked page scroll on mobile). Camera stays fixed — only the shirt spins.
 * While `locked` (sketch edit mode) it neither rotates nor releases the vertical
 * swipe — the drag belongs to the design being adjusted.
 */
function Turntable({
  focusArea,
  locked,
  onFirstInteract,
  children,
}: {
  focusArea?: string;
  /** Edit mode: drags belong to the design, not to the turntable. */
  locked?: boolean;
  onFirstInteract?: () => void;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const target = useRef(0);
  const { gl } = useThree();

  // The pointer effect depends on [gl] alone, so reading `locked` inside its
  // handlers would capture the first render's value forever. A ref updated by
  // its own effect is the only way the lock ever takes hold — and `locked` must
  // NOT join the pointer effect's deps, or every toggle re-runs it.
  const lockedRef = useRef(false);
  useEffect(() => {
    lockedRef.current = !!locked;
  }, [locked]);

  // Clicking a design area spins the shirt to face it (back = 180°, everything
  // else = front). Rotate the SHORT way around from wherever it currently is.
  useEffect(() => {
    // 'back' faces the rear; every other area (and no area / non-design steps)
    // faces the front. Rotate the SHORT way from wherever it is.
    const angle = focusArea === 'back' ? Math.PI : 0;
    target.current = shortWayTo(angle, target.current);
  }, [focusArea]);

  // Entering edit mode SNAPS to the area's angle instead of lerping there: the
  // px→units mapping assumes the model faces exactly 0 or π. Driven by `locked`,
  // not by `focusArea` — re-entering edit on the same area leaves `focusArea`
  // unchanged while the user may have spun the model. Both values must be set:
  // useFrame lerps `rotation.y` back toward `target.current` on the next frame.
  useEffect(() => {
    if (!locked) return;
    const angle = focusArea === 'back' ? Math.PI : 0;
    target.current = shortWayTo(angle, target.current);
    const g = group.current;
    if (g) g.rotation.y = target.current;
  }, [locked, focusArea]);

  // Own effect, so toggling the lock never re-runs the pointer effect.
  useEffect(() => {
    gl.domElement.style.touchAction = locked ? 'none' : 'pan-y';
  }, [gl, locked]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = 'grab';
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      // Gate `down` too, not just `move`: otherwise the cursor still flips to
      // `grabbing` in edit mode.
      if (lockedRef.current) return;
      dragging = true;
      lastX = e.clientX;
      el.style.cursor = 'grabbing';
      onFirstInteract?.();
    };
    const move = (e: PointerEvent) => {
      if (lockedRef.current || !dragging) return;
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
export default function Preview3DStage({ colorHex, designs, showGuides, activeArea, variant, modelUrl, warmAll, noHint, editArea, onCommit }: Preview3DStageProps) {
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    if (!warmAll) return;
    // Delay warming the OTHER models so this page's own model wins the
    // bandwidth and appears immediately (even before a colour is chosen).
    const t = setTimeout(() => preloadAllModels(), 4000);
    return () => clearTimeout(t);
  }, [warmAll]);
  // Re-arm the drag hint every time the user reaches the design step.
  useEffect(() => {
    if (showGuides) setInteracted(false);
  }, [showGuides]);
  // The bucket hat's wide brim fills the frame — give it more margin so it
  // reads a touch smaller than the shirts.
  const fitMargin = variant === 'cap' ? 1.2 : 1.0;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'url(/assets/designer-3d-bg.png?v=3) center / cover no-repeat',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMERA.position, fov: CAMERA.fov }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.22} />
        <directionalLight position={[4, 6, 5]} intensity={1.45} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
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
          {/* key on the model → Bounds remounts and re-fits the framing when
              the shirt swaps (the polo is ~100× larger in world units). No
              `observe`: it must NOT re-fit on container resize between steps —
              the camera distance stays constant across all steps. */}
          <Bounds key={modelUrl ?? 'tshirt'} fit clip margin={fitMargin}>
            <Turntable focusArea={editArea ?? activeArea} locked={!!editArea} onFirstInteract={() => setInteracted(true)}>
              <Tshirt3DModel
                color={colorHex}
                designs={designs}
                showGuides={showGuides}
                activeArea={activeArea}
                editArea={editArea}
                onCommit={onCommit}
                variant={variant}
                modelUrl={modelUrl}
              />
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
          // Only on the design/upload step (showGuides), and until the first drag.
          opacity: showGuides && !interacted && !noHint ? 1 : 0,
          transition: 'opacity 0.6s ease',
          background: 'rgba(12,12,16,0.42)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(20,20,20,0.72)',
            color: '#ffffff',
            padding: '16px 26px',
            borderRadius: 18,
            boxShadow: '0 4px 22px rgba(0,0,0,0.35)',
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

      {/* Caption below the shirt — illustration disclaimer (black). */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 4,
          color: '#141414',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: '"Assistant","Rubik",system-ui,sans-serif',
        }}
      >
        סקיצה להמחשה בלבד
      </div>
    </div>
  );
}
