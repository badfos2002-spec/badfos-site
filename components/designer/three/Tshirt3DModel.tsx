'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Decal, Center } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';

/* ------------------------------------------------------------------ *
 * TUNABLE CONSTANTS — adjust after seeing the model on the page.
 * ------------------------------------------------------------------ */

const MODEL: {
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
} = {
  scale: 1,
  rotation: [0, 0, 0],
  position: [0, 0, 0],
};

// Per-AREA artwork placement, in the body geometry's normalized local space:
// x ∈ [-0.8,0.8] (width), y ∈ [-1,1] (+y=up), z ∈ [-0.4,0.4] (+z=front).
// `size` is the MAX extent of the artwork; the real w/h come from the image
// aspect so the print is never stretched. `depth` straddles the curved surface.
type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  depth: number;
};

const AREA_DECALS: Record<string, Placement> = {
  // front_full sits lower (chest→belly) so it clears the chest logos above it.
  front_full: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  back: { position: [0, 0.16, -0.3], rotation: [0, Math.PI, 0], size: 0.71, depth: 0.55 },
  // chest logos: higher on the chest and spread further apart (left ↔ right).
  chest_logo: { position: [-0.31, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  chest_logo_right: { position: [0.31, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  center: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  center_wide: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.72, depth: 0.55 },
};

// The design-area guide blocks drawn ON the shirt (like the 2D designer): a
// dashed labelled rectangle per area, welded to the fabric so it rotates with
// the shirt. Shown only for EMPTY areas while on the design step.
const GUIDE_AREAS = ['front_full', 'back', 'chest_logo', 'chest_logo_right'] as const;
const GUIDE_BOX: Record<string, { w: number; h: number; label: string }> = {
  front_full: { w: 0.5, h: 0.62, label: 'קדמי מלא' },
  back: { w: 0.575, h: 0.71, label: 'גב' },
  chest_logo: { w: 0.17, h: 0.17, label: 'סמל שמאל' },
  chest_logo_right: { w: 0.17, h: 0.17, label: 'סמל ימין' },
};

/* ------------------------------------------------------------------ */

function makeGuideTexture(label: string, color: string, wOverH: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const H = 256;
  const W = Math.round(H * wOverH);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, W, H);

  // dashed rounded rectangle border
  const m = 14;
  const r = 22;
  const x = m,
    y = m,
    w = W - 2 * m,
    h = H - 2 * m;
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.setLineDash([20, 13]);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();

  // centered label
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  const fs = Math.max(18, Math.min(34, W / (label.length * 0.62)));
  ctx.font = `bold ${Math.round(fs)}px Arial, "Assistant", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, W / 2, H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Dashed labelled area guide, welded to the shirt. */
function GuideDecal({ area, active }: { area: string; active: boolean }) {
  const placement = AREA_DECALS[area];
  const box = GUIDE_BOX[area];
  const color = active ? '#22c55e' : '#8b95a3';
  const texture = useMemo(() => makeGuideTexture(box.label, color, box.w / box.h), [box, color]);
  if (!placement || !box || !texture) return null;
  return (
    <Decal
      position={placement.position}
      rotation={placement.rotation}
      scale={[box.w, box.h, placement.depth]}
      depthTest
    >
      <meshStandardMaterial
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-8}
        roughness={0.9}
      />
    </Decal>
  );
}

/**
 * One artwork decal welded to the shirt body, sized to the image aspect (max
 * extent = placement.size) so the print keeps its proportions.
 */
function ShirtDecal({ url, placement }: { url: string; placement: Placement }) {
  const texture = useLoader(THREE.TextureLoader, url);

  useMemo(() => {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const scale = useMemo<[number, number, number]>(() => {
    const img = texture.image as { width?: number; height?: number } | undefined;
    const aspect = img?.width && img?.height ? img.width / img.height : 1;
    const s = placement.size;
    const sx = aspect >= 1 ? s : s * aspect;
    const sy = aspect >= 1 ? s / aspect : s;
    return [sx, sy, placement.depth];
  }, [texture, placement]);

  return (
    <Decal position={placement.position} rotation={placement.rotation} scale={scale} depthTest>
      <meshStandardMaterial
        map={texture}
        transparent
        polygonOffset
        polygonOffsetFactor={-6}
        roughness={0.9}
      />
    </Decal>
  );
}

export interface ShirtDesign {
  area: string;
  url: string;
}

interface Tshirt3DModelProps {
  color: string;
  designs: ShirtDesign[];
  showGuides?: boolean;
  activeArea?: string;
}

export default function Tshirt3DModel({ color, designs, showGuides, activeArea }: Tshirt3DModelProps) {
  const { scene } = useGLTF('/models/tshirt-web.glb');

  const shirtColor = useMemo(() => {
    const c = new THREE.Color(color);
    if (Math.max(c.r, c.g, c.b) < 0.12) c.setRGB(0.09, 0.093, 0.1);
    return c;
  }, [color]);

  // A white shirt reads grey under the studio shading. For near-white colors
  // ONLY, add a white self-illumination so the shaded folds lift back toward
  // white (a "brightness" boost); every other color is left untouched.
  const emissiveIntensity = useMemo(() => {
    const c = new THREE.Color(color);
    const isNearWhite = c.r > 0.82 && c.g > 0.82 && c.b > 0.82;
    return isNearWhite ? 0.32 : 0;
  }, [color]);

  const meshes = useMemo(() => {
    const cloned = scene.clone(true);
    const collected: THREE.Mesh[] = [];
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) collected.push(obj as THREE.Mesh);
    });
    collected.sort(
      (a, b) =>
        (b.geometry.attributes.position?.count ?? 0) -
        (a.geometry.attributes.position?.count ?? 0)
    );
    return collected;
  }, [scene]);

  const bodyMesh = meshes[0];
  const uploaded = useMemo(() => new Set(designs.filter((d) => d.url).map((d) => d.area)), [designs]);

  return (
    <group scale={MODEL.scale} rotation={MODEL.rotation} position={MODEL.position}>
      <Center>
        {meshes.map((mesh, i) => {
          const isBody = mesh === bodyMesh;
          return (
            <mesh
              key={mesh.uuid ?? i}
              geometry={mesh.geometry}
              position={mesh.position}
              rotation={mesh.rotation}
              scale={mesh.scale}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={shirtColor}
                emissive="#ffffff"
                emissiveIntensity={emissiveIntensity}
                roughness={0.85}
                metalness={0.05}
                side={THREE.DoubleSide}
              />
              {isBody ? (
                <>
                  {designs.map((d) => {
                    const placement = AREA_DECALS[d.area];
                    if (!placement || !d.url) return null;
                    return <ShirtDecal key={d.area} url={d.url} placement={placement} />;
                  })}
                  {showGuides
                    ? GUIDE_AREAS.filter((a) => !uploaded.has(a)).map((a) => (
                        <GuideDecal key={`guide-${a}`} area={a} active={a === activeArea} />
                      ))
                    : null}
                </>
              ) : null}
            </mesh>
          );
        })}
      </Center>
    </group>
  );
}

useGLTF.preload('/models/tshirt-web.glb');
