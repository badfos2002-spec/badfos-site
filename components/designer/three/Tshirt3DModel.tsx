'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Decal } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';

/* ------------------------------------------------------------------ *
 * TUNABLE CONSTANTS — adjust after seeing each model on the page.
 * Placements are in the target mesh's normalized local space.
 * ------------------------------------------------------------------ */

const MODEL: {
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
} = { scale: 1, rotation: [0, 0, 0], position: [0, 0, 0] };

type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number; // max artwork extent (real w/h from image aspect → no stretch)
  depth: number; // projector depth across the curved surface
  panel?: 'front' | 'back'; // which panel to project onto (multi-panel models)
};
type GuideBox = { w: number; h: number; label: string };

// TSHIRT — a single body mesh (front +z / back −z live on the same mesh).
const TSHIRT_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  back: { position: [0, 0.14, -0.3], rotation: [0, Math.PI, 0], size: 0.8, depth: 0.55 },
  chest_logo: { position: [-0.27, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  chest_logo_right: { position: [0.27, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  center: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  center_wide: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.72, depth: 0.55 },
};
const TSHIRT_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.5, h: 0.62, label: 'קדמי מלא' },
  back: { w: 0.575, h: 0.82, label: 'גב' },
  chest_logo: { w: 0.17, h: 0.17, label: 'סמל שמאל' },
  chest_logo_right: { w: 0.17, h: 0.17, label: 'סמל ימין' },
};

// POLO — separate front panel (local z ∈ [-0.15,0.46]) and back panel
// (local z ∈ [-0.46,0]). Front artwork projects +z onto the front panel,
// back artwork projects −z onto the back panel.
const POLO_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.08, 0.36], rotation: [0, 0, 0], size: 0.52, depth: 0.5, panel: 'front' },
  back: { position: [0, 0.12, -0.36], rotation: [0, Math.PI, 0], size: 0.71, depth: 0.5, panel: 'back' },
  chest_logo: { position: [-0.24, 0.44, 0.34], rotation: [0, 0, 0], size: 0.22, depth: 0.4, panel: 'front' },
  chest_logo_right: { position: [0.24, 0.44, 0.34], rotation: [0, 0, 0], size: 0.22, depth: 0.4, panel: 'front' },
};
const POLO_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.4, h: 0.5, label: 'קדמי מלא' },
  back: { w: 0.575, h: 0.71, label: 'גב' },
  chest_logo: { w: 0.2, h: 0.2, label: 'סמל שמאל' },
  chest_logo_right: { w: 0.2, h: 0.2, label: 'סמל ימין' },
};

// OVERSIZED — one wide body mesh (local x ∈ [-1,1], front +z). Like the tshirt
// but baggier, so artwork sits a touch lower/larger and logos spread wider.
const OVERSIZED_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.66, depth: 0.55 },
  back: { position: [0, 0.11, -0.3], rotation: [0, Math.PI, 0], size: 0.74, depth: 0.55 },
  chest_logo: { position: [-0.3, 0.52, 0.28], rotation: [0, 0, 0], size: 0.17, depth: 0.45 },
  chest_logo_right: { position: [0.3, 0.52, 0.28], rotation: [0, 0, 0], size: 0.17, depth: 0.45 },
  center: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.66, depth: 0.55 },
  center_wide: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.78, depth: 0.55 },
};
const OVERSIZED_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.54, h: 0.64, label: 'קדמי מלא' },
  back: { w: 0.6, h: 0.74, label: 'גב' },
  chest_logo: { w: 0.18, h: 0.18, label: 'סמל שמאל' },
  chest_logo_right: { w: 0.18, h: 0.18, label: 'סמל ימין' },
};

// CAP (bucket hat) — one low-poly mesh. Y is up, the round brim is in the XZ
// plane; a single front logo projects +z onto the crown (local z up to 1.0).
const CAP_AREAS: Record<string, Placement> = {
  center: { position: [0, 0.2, 0.55], rotation: [0, 0, 0], size: 0.36, depth: 0.9 },
  center_wide: { position: [0, 0.1, 0.55], rotation: [0, 0, 0], size: 0.62, depth: 0.9 },
  front_full: { position: [0, 0.2, 0.55], rotation: [0, 0, 0], size: 0.36, depth: 0.9 },
};
const CAP_GUIDES: Record<string, GuideBox> = {
  center: { w: 0.36, h: 0.34, label: 'קדמי' },
  center_wide: { w: 0.62, h: 0.26, label: 'קדמי רוחבי' },
};

const VARIANTS = {
  tshirt: { areas: TSHIRT_AREAS, guides: TSHIRT_GUIDES, panels: false },
  polo: { areas: POLO_AREAS, guides: POLO_GUIDES, panels: true },
  oversized: { areas: OVERSIZED_AREAS, guides: OVERSIZED_GUIDES, panels: false },
  cap: {
    areas: CAP_AREAS,
    guides: CAP_GUIDES,
    panels: false,
    normalMapUrl: '/models/tex/cap-normal.png',
    roughMapUrl: '/models/tex/cap-rough.png',
    singleArea: true, // areas are mutually exclusive → show only the active one
  },
} as const;

export type ShirtVariant = keyof typeof VARIANTS;

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
  const m = 14,
    r = 22,
    x = m,
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

function GuideDecal({ placement, box, active }: { placement: Placement; box: GuideBox; active: boolean }) {
  const color = active ? '#22c55e' : '#8b95a3';
  const texture = useMemo(() => makeGuideTexture(box.label, color, box.w / box.h), [box, color]);
  if (!texture) return null;
  return (
    <Decal position={placement.position} rotation={placement.rotation} scale={[box.w, box.h, placement.depth]} depthTest>
      <meshStandardMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-8} roughness={0.9} />
    </Decal>
  );
}

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
      <meshStandardMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-6} roughness={0.9} />
    </Decal>
  );
}

/** Plain fabric material — used by most models (their geometry carries the weave). */
function ShirtMaterial({ color, emissiveIntensity }: { color: THREE.Color; emissiveIntensity: number }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive="#ffffff"
      emissiveIntensity={emissiveIntensity}
      roughness={0.85}
      metalness={0.05}
      side={THREE.DoubleSide}
    />
  );
}

/** Fabric material with a normal map — adds woven texture to low-poly models
 *  (the bucket hat) that would otherwise render smooth/plastic. */
function TexturedMaterial({
  color,
  emissiveIntensity,
  normalMapUrl,
  roughMapUrl,
}: {
  color: THREE.Color;
  emissiveIntensity: number;
  normalMapUrl: string;
  roughMapUrl: string;
}) {
  const [normalMap, roughMap] = useLoader(THREE.TextureLoader, [normalMapUrl, roughMapUrl]);
  useMemo(() => {
    [normalMap, roughMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.flipY = false; // match glTF UV origin (top-left)
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
    });
  }, [normalMap, roughMap]);
  const normalScale = useMemo(() => new THREE.Vector2(1.3, 1.3), []);
  return (
    <meshStandardMaterial
      color={color}
      emissive="#ffffff"
      emissiveIntensity={emissiveIntensity}
      roughness={1}
      metalness={0.04}
      normalMap={normalMap}
      normalScale={normalScale}
      roughnessMap={roughMap}
      side={THREE.DoubleSide}
    />
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
  variant?: ShirtVariant;
  modelUrl?: string;
}

export default function Tshirt3DModel({
  color,
  designs,
  showGuides,
  activeArea,
  variant = 'tshirt',
  modelUrl = '/models/tshirt-web.glb',
}: Tshirt3DModelProps) {
  const { scene } = useGLTF(modelUrl);
  const cfg = VARIANTS[variant] ?? VARIANTS.tshirt;
  const normalMapUrl = (cfg as { normalMapUrl?: string }).normalMapUrl;
  const roughMapUrl = (cfg as { roughMapUrl?: string }).roughMapUrl;
  const singleArea = (cfg as { singleArea?: boolean }).singleArea;

  const shirtColor = useMemo(() => {
    const c = new THREE.Color(color);
    if (Math.max(c.r, c.g, c.b) < 0.12) c.setRGB(0.09, 0.093, 0.1);
    return c;
  }, [color]);

  const emissiveIntensity = useMemo(() => {
    const c = new THREE.Color(color);
    return c.r > 0.82 && c.g > 0.82 && c.b > 0.82 ? 0.12 : 0;
  }, [color]);

  const meshes = useMemo(() => {
    const cloned = scene.clone(true);
    let collected: THREE.Mesh[] = [];
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) collected.push(obj as THREE.Mesh);
    });
    // The polo model ships with stray flat horizontal "disc/ring" geometry that
    // cuts across the shirt. Drop meshes that are very thin in Y but wide in
    // X & Z (a garment panel is always tall). Tshirt has no such parts.
    if (variant === 'polo') {
      collected = collected.filter((m) => {
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox!;
        const dx = bb.max.x - bb.min.x;
        const dy = bb.max.y - bb.min.y;
        const dz = bb.max.z - bb.min.z;
        const isDisc = dy < 0.3 * dx && dy < 0.6 * dz && dx > 0.5;
        return !isDisc;
      });
    }
    collected.sort(
      (a, b) => (b.geometry.attributes.position?.count ?? 0) - (a.geometry.attributes.position?.count ?? 0)
    );
    return collected;
  }, [scene, variant]);

  // Which mesh each artwork projects onto. Single-body models (tshirt) put
  // every decal on the largest mesh. Multi-panel models (polo) route front
  // artwork to the largest front-facing panel and back artwork to the back.
  const { bodyMesh, frontMesh, backMesh } = useMemo(() => {
    const body = meshes[0];
    if (!cfg.panels) return { bodyMesh: body, frontMesh: body, backMesh: body };
    const scored = meshes.map((m) => {
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox!;
      return { m, zc: (bb.min.z + bb.max.z) / 2, n: m.geometry.attributes.position.count };
    });
    const front = scored.filter((s) => s.zc >= 0).sort((a, b) => b.n - a.n)[0]?.m ?? body;
    const back = scored.filter((s) => s.zc < 0).sort((a, b) => b.n - a.n)[0]?.m ?? body;
    return { bodyMesh: body, frontMesh: front, backMesh: back };
  }, [meshes, cfg.panels]);

  const targetFor = (area: string): THREE.Mesh => {
    if (!cfg.panels) return bodyMesh;
    return cfg.areas[area]?.panel === 'back' ? backMesh : frontMesh;
  };

  const uploaded = useMemo(() => new Set(designs.filter((d) => d.url).map((d) => d.area)), [designs]);
  const guideAreas = Object.keys(cfg.guides);

  // Normalize every model to a consistent size + centre it, using PROPS (not an
  // effect like <Center>), so <Bounds> measures the real framed object on its
  // first render. The tshirt is ~0.7 units, the polo ~76 — this evens them out.
  const { normScale, center } = useMemo(() => {
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    meshes.forEach((m) => {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      m.updateMatrix();
      tmp.copy(m.geometry.boundingBox as THREE.Box3).applyMatrix4(m.matrix);
      box.union(tmp);
    });
    const size = new THREE.Vector3();
    box.getSize(size);
    const c = new THREE.Vector3();
    box.getCenter(c);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { normScale: 2.0 / maxDim, center: c };
  }, [meshes]);

  return (
    <group scale={normScale * MODEL.scale} rotation={MODEL.rotation}>
      <group position={[-center.x, -center.y, -center.z]}>
        {meshes.map((mesh, i) => (
          <mesh
            key={mesh.uuid ?? i}
            geometry={mesh.geometry}
            position={mesh.position}
            rotation={mesh.rotation}
            scale={mesh.scale}
            castShadow
            receiveShadow
          >
            {normalMapUrl && roughMapUrl ? (
              <TexturedMaterial
                color={shirtColor}
                emissiveIntensity={emissiveIntensity}
                normalMapUrl={normalMapUrl}
                roughMapUrl={roughMapUrl}
              />
            ) : (
              <ShirtMaterial color={shirtColor} emissiveIntensity={emissiveIntensity} />
            )}
            {designs.map((d) => {
              const placement = cfg.areas[d.area];
              if (!placement || !d.url || targetFor(d.area) !== mesh) return null;
              return <ShirtDecal key={d.area} url={d.url} placement={placement} />;
            })}
            {showGuides
              ? guideAreas
                  .filter(
                    (a) =>
                      !uploaded.has(a) &&
                      cfg.areas[a] &&
                      targetFor(a) === mesh &&
                      (!singleArea || a === activeArea)
                  )
                  .map((a) => (
                    <GuideDecal key={`guide-${a}`} placement={cfg.areas[a]} box={cfg.guides[a]} active={a === activeArea} />
                  ))
              : null}
          </mesh>
        ))}
      </group>
    </group>
  );
}

useGLTF.preload('/models/tshirt-web.glb');
useGLTF.preload('/models/polo-web.glb');
useGLTF.preload('/models/oversized-web.glb');
useGLTF.preload('/models/cap-web.glb');
