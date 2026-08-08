'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF, Decal } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { DecalGeometry } from 'three-stdlib';
import { DesignTransform, withTransform } from './decalTransform';

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
  front_full: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.68, depth: 0.55 },
  back: { position: [0, 0.14, -0.3], rotation: [0, Math.PI, 0], size: 0.92, depth: 0.55 },
  chest_logo: { position: [-0.27, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  chest_logo_right: { position: [0.27, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  center: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  center_wide: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.72, depth: 0.55 },
};
const TSHIRT_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.62, h: 0.68, label: 'קדמי מלא' },
  back: { w: 0.72, h: 0.92, label: 'גב' },
  chest_logo: { w: 0.17, h: 0.17, label: 'סמל ימין' },
  chest_logo_right: { w: 0.17, h: 0.17, label: 'סמל שמאל' },
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
  chest_logo: { w: 0.2, h: 0.2, label: 'סמל ימין' },
  chest_logo_right: { w: 0.2, h: 0.2, label: 'סמל שמאל' },
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
  chest_logo: { w: 0.18, h: 0.18, label: 'סמל ימין' },
  chest_logo_right: { w: 0.18, h: 0.18, label: 'סמל שמאל' },
};

// CAP (bucket hat) — one low-poly mesh. Y is up, the round brim is in the XZ
// plane; a single front logo projects +z onto the crown (local z up to 1.0).
const CAP_AREAS: Record<string, Placement> = {
  center: { position: [0, 0.12, 0.55], rotation: [0, 0, 0], size: 0.44, depth: 0.9 },
  center_wide: { position: [0, 0.1, 0.55], rotation: [0, 0, 0], size: 0.62, depth: 0.9 },
  front_full: { position: [0, 0.12, 0.55], rotation: [0, 0, 0], size: 0.44, depth: 0.9 },
};
const CAP_GUIDES: Record<string, GuideBox> = {
  center: { w: 0.44, h: 0.42, label: 'קדמי' },
  center_wide: { w: 0.62, h: 0.26, label: 'קדמי רוחבי' },
};

// HOODIE / ZIP-HOODIE — single wide body mesh (x∈[-1,1], front +z ~0.48).
// A hood sits high on the back; artwork stays on the chest/back panel.
const HOODIE_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.06, 0.33], rotation: [0, 0, 0], size: 0.56, depth: 0.55 },
  back: { position: [0, 0.01, -0.33], rotation: [0, Math.PI, 0], size: 0.64, depth: 0.55 },
  chest_logo: { position: [-0.22, 0.46, 0.31], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  chest_logo_right: { position: [0.22, 0.46, 0.31], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  center: { position: [0, 0.06, 0.33], rotation: [0, 0, 0], size: 0.56, depth: 0.55 },
  center_wide: { position: [0, 0.06, 0.33], rotation: [0, 0, 0], size: 0.68, depth: 0.55 },
};
const HOODIE_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.48, h: 0.58, label: 'קדמי מלא' },
  back: { w: 0.55, h: 0.66, label: 'גב' },
  chest_logo: { w: 0.18, h: 0.18, label: 'סמל ימין' },
  chest_logo_right: { w: 0.18, h: 0.18, label: 'סמל שמאל' },
};

// Crewneck (פוטר) — same body as the hoodie but no hood, so the back print
// sits a bit HIGHER than on the hooded types.
const SWEAT_AREAS: Record<string, Placement> = {
  ...HOODIE_AREAS,
  back: { position: [0, 0.16, -0.33], rotation: [0, Math.PI, 0], size: 0.64, depth: 0.55 },
};

// Zip hoodie: no full-front print (the zipper runs down the centre) — back +
// chest logos only.
const ZIP_AREAS: Record<string, Placement> = {
  back: HOODIE_AREAS.back,
  chest_logo: HOODIE_AREAS.chest_logo,
  chest_logo_right: HOODIE_AREAS.chest_logo_right,
};
const ZIP_GUIDES: Record<string, GuideBox> = {
  back: HOODIE_GUIDES.back,
  chest_logo: HOODIE_GUIDES.chest_logo,
  chest_logo_right: HOODIE_GUIDES.chest_logo_right,
};

// Tote bag — front faces +Z; thin, tall body with handles at the top. The print
// sits on the front panel, centred, in the lower-middle of the body.
const TOTE_AREAS: Record<string, Placement> = {
  front_full: { position: [0, -0.22, 0.2], rotation: [0, 0, 0], size: 0.72, depth: 0.4 },
};
const TOTE_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.6, h: 0.78, label: 'קדמי' },
};

// Volume tote — fuller body, front panel sits further out on +Z than the flat tote.
const TOTEVOL_AREAS: Record<string, Placement> = {
  front_full: { position: [0, -0.28, 0.34], rotation: [0, 0, 0], size: 0.72, depth: 0.55 },
  back: { position: [0, -0.28, -0.34], rotation: [0, Math.PI, 0], size: 0.72, depth: 0.55 },
};
const TOTEVOL_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.6, h: 0.68, label: 'צד קדמי' },
  back: { w: 0.6, h: 0.68, label: 'צד אחורי' },
};

// Drawstring backpack — smooth print panel toward +Z, cords behind.
// Front surface sits at z 0.30–0.50 in the central window.
const DSBAG_AREAS: Record<string, Placement> = {
  front_full: { position: [0, -0.05, 0.4], rotation: [0, 0, 0], size: 0.75, depth: 0.5 },
};
const DSBAG_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.75, h: 0.75, label: 'צד קדמי' },
};

// Baby onesie — purchased worn model, front toward +Z. Chest surface sits at
// z 0.40–0.47 and the back at z −0.39..−0.30; each projector window stays on
// its own side of the garment.
const BABY_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.18, 0.42], rotation: [0, 0, 0], size: 0.62, depth: 0.5 },
  back: { position: [0, 0.18, -0.34], rotation: [0, Math.PI, 0], size: 0.62, depth: 0.5 },
};
const BABY_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.62, h: 0.75, label: 'קידמי' },
  back: { w: 0.62, h: 0.75, label: 'גב' },
};

// Cooking apron — single sheet, bib + body toward +Z, ties behind. The print
// sits on the chest, above the pocket seams.
const APRON_AREAS: Record<string, Placement> = {
  center: { position: [0, 0.38, 0.28], rotation: [0, 0, 0], size: 0.5, depth: 0.4 },
};
const APRON_GUIDES: Record<string, GuideBox> = {
  center: { w: 0.46, h: 0.46, label: 'מרכזי' },
};

// Buff (neck gaiter, worn) — face side toward +Z. The print sits centred on
// the front of the tube.
const BUFF_AREAS: Record<string, Placement> = {
  center: { position: [0, 0.28, 0.5], rotation: [0, 0, 0], size: 0.6, depth: 0.9 },
};
const BUFF_GUIDES: Record<string, GuideBox> = {
  center: { w: 0.6, h: 0.6, label: 'מרכזי' },
};

// Hi-vis vest — front faces +Z; open V-neck front with a centre seam. Big
// print on the back, small logos on the left/right chest panels.
const VEST_AREAS: Record<string, Placement> = {
  back: { position: [0, 0.42, -0.35], rotation: [0, Math.PI, 0], size: 0.55, depth: 0.3 },
  chest_logo: { position: [-0.3, 0.35, 0.28], rotation: [0, 0, 0], size: 0.2, depth: 0.5 },
  chest_logo_right: { position: [0.3, 0.35, 0.28], rotation: [0, 0, 0], size: 0.2, depth: 0.5 },
};
const VEST_GUIDES: Record<string, GuideBox> = {
  back: { w: 0.55, h: 0.48, label: 'גב' },
  chest_logo: { w: 0.22, h: 0.22, label: 'סמל כיס ימין' },
  chest_logo_right: { w: 0.22, h: 0.22, label: 'סמל כיס שמאל' },
};

// Trucker / mesh cap — front panel faces +Z; the print sits centred on the
// front panel (upper-middle of the cap).
const MESHCAP_AREAS: Record<string, Placement> = {
  center: { position: [0, 0.08, 0.5], rotation: [0, 0, 0], size: 0.46, depth: 0.9 },
};
const MESHCAP_GUIDES: Record<string, GuideBox> = {
  center: { w: 0.46, h: 0.4, label: 'קדמי' },
};

const VARIANTS = {
  tshirt: { areas: TSHIRT_AREAS, guides: TSHIRT_GUIDES, panels: false },
  tote: { areas: TOTE_AREAS, guides: TOTE_GUIDES, panels: false },
  // NOTE: no normal map — the source texture's reflective-stripe regions
  // produce ugly speckles at web resolution; the quilted geometry carries
  // plenty of detail on its own.
  vest: {
    areas: VEST_AREAS,
    guides: VEST_GUIDES,
    panels: false,
    // Real hi-vis look: body in the chosen neon colour, reflective stripes in
    // silver, binding + zipper tape in black — matched by source material name.
    // Binding + zipper tape follow the vest colour (owner preference);
    // only the reflective stripes stay silver.
    parts: [
      { match: 'FABRIC_2V', kind: 'body' },     // vertical shoulder stripes → vest colour
      { match: 'FABRIC_2_Copy', kind: 'body' },
      { match: 'FABRIC_2_FRONT', kind: 'silver' }, // horizontal reflective bands
      { match: 'FABRIC_1', kind: 'body' },
      { match: 'FABRIC_4', kind: 'body' },
    ],
  },
  // NOTE: the purchased model's normal map is object-space (baked patchwork) —
  // applying it as tangent-space shatters the shading, so the baby uses the
  // plain fabric material.
  baby: { areas: BABY_AREAS, guides: BABY_GUIDES, panels: false },
  apron: {
    areas: APRON_AREAS,
    guides: APRON_GUIDES,
    panels: false,
    // Full source texture set: whitened diffuse (seams/stitching, tinted by the
    // selected colour), twill normal map, and roughness from the gloss map.
    normalMapUrl: '/models/tex/apron-normal.png',
    roughMapUrl: '/models/tex/apron-rough.png',
    baseMapUrl: '/models/tex/apron-base.png',
    normalScale: 1.5,
    singleSheet: true, // one fabric layer → decals must not show through the back
  },
  buff: {
    areas: BUFF_AREAS,
    guides: BUFF_GUIDES,
    panels: false,
    // Fabric weave via the source normal map; uniform matte roughness.
    normalMapUrl: '/models/tex/buff-normal.png',
    roughMapUrl: '/models/tex/flat-white.png',
    normalScale: 1.6,
  },
  dsbag: { areas: DSBAG_AREAS, guides: DSBAG_GUIDES, panels: false },
  totevolume: {
    areas: TOTEVOL_AREAS,
    guides: TOTEVOL_GUIDES,
    panels: false,
    // Canvas fabric weave via the source normal map (flat-white rough = uniform matte).
    normalMapUrl: '/models/tex/tote-normal.png',
    roughMapUrl: '/models/tex/flat-white.png',
    normalScale: 1.8,
  },
  sweatshirt: { areas: SWEAT_AREAS, guides: HOODIE_GUIDES, panels: false },
  hoodie: { areas: HOODIE_AREAS, guides: HOODIE_GUIDES, panels: false },
  ziphoodie: { areas: ZIP_AREAS, guides: ZIP_GUIDES, panels: false },
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
  meshcap: {
    areas: MESHCAP_AREAS,
    guides: MESHCAP_GUIDES,
    panels: false,
    normalMapUrl: '/models/tex/meshcap-normal.png',
    roughMapUrl: '/models/tex/meshcap-rough.png',
    normalScale: 2.6, // trucker fabric + mesh weave reads clearly even on light colours
    // Two-tone trucker: the basecolor texture is WHITE on the front panels and
    // black everywhere else (mesh, visor, straps). We tint only the black
    // regions with the selected colour — the front panel stays white, exactly
    // like a real trucker cap. The AO map bakes the mesh weave into the map.
    baseMapUrl: '/models/tex/meshcap-base.png',
    aoMapUrl: '/models/tex/meshcap-ao.png',
    heightMapUrl: '/models/tex/meshcap-weave.png', // 2048 pre-baked weave shading
    singleArea: true,
  },
} as const;

export type ShirtVariant = keyof typeof VARIANTS;

/* ------------------------------------------------------------------ */

/** Perceptual luminance test on the selected swatch hex. Dark fabrics (black,
 *  navy, gray, melange, olive, burgundy…) need a white guide outline instead of
 *  the default gray, which would otherwise disappear against the fabric. */
function isDarkFabric(hex: string): boolean {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? '').trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 172;
}

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

function GuideDecal({ placement, box, active, dark }: { placement: Placement; box: GuideBox; active: boolean; dark: boolean }) {
  // Active area stays green (reads on any fabric). Inactive areas: white on dark
  // fabrics, the usual gray on light ones.
  const color = active ? '#22c55e' : dark ? '#ffffff' : '#8b95a3';
  const texture = useMemo(() => makeGuideTexture(box.label, color, box.w / box.h), [box, color]);
  if (!texture) return null;
  return (
    <Decal position={placement.position} rotation={placement.rotation} scale={[box.w, box.h, placement.depth]} depthTest>
      <meshStandardMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-8} roughness={0.9} />
    </Decal>
  );
}

// Manual (non-suspending) texture load. `useLoader` throws on a failed image
// (CORS, an undecodable format, a network hiccup), and that throw bubbles up
// to ThreeErrorBoundary — collapsing the ENTIRE 3D scene back to the flat 2D
// fallback, permanently. Loading by hand instead means a single bad artwork
// just skips its own decal; the 3D garment (and every other decal) survives.
function useArtworkTexture(url: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    // Firebase Storage serves design images WITHOUT CORS headers, so a WebGL
    // texture (loaded crossOrigin="anonymous") can't read them and the decal
    // never appears. Route those through our same-origin proxy; data:/blob:/
    // same-origin urls load directly.
    const src = /^https:\/\/firebasestorage\.googleapis\.com\//.test(url)
      ? `/api/design-proxy?url=${encodeURIComponent(url)}`
      : url;
    loader.load(
      src,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.anisotropy = 8;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      () => { /* image failed to load — skip this decal, keep the 3D scene alive */ },
    );
    return () => { cancelled = true; };
  }, [url]);
  return texture;
}

// Contain-fit the artwork INSIDE the printable area rectangle (box.w × box.h),
// preserving aspect ratio — the decal fills the area as large as possible but
// never spills past it. (The old square fit by `placement.size` could exceed
// the guide box on non-square areas like front_full.)
function artworkScale(
  texture: THREE.Texture | null,
  placement: Placement,
  box?: GuideBox,
  scale = 1,
): [number, number, number] {
  const img = texture?.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img?.height ? img.width / img.height : 1;
  if (box) {
    let dw = box.w;
    let dh = box.w / aspect;
    if (dh > box.h) { dh = box.h; dw = box.h * aspect; }
    // `depth` is the projector's z-extent across the curved surface, NOT an
    // artwork dimension — scaling it would drag in far-side geometry.
    return [dw * scale, dh * scale, placement.depth];
  }
  // Fallback (area with no guide box): fit within a square of placement.size.
  const s = placement.size * scale;
  const sx = aspect >= 1 ? s : s * aspect;
  const sy = aspect >= 1 ? s / aspect : s;
  return [sx, sy, placement.depth];
}

function ShirtDecal({ url, placement, box, transform }: { url: string; placement: Placement; box?: GuideBox; transform?: DesignTransform }) {
  const texture = useArtworkTexture(url);
  const eff = useMemo(() => withTransform(placement, transform), [placement, transform]);
  const scale = useMemo<[number, number, number]>(
    () => artworkScale(texture, eff, box, transform?.scale ?? 1),
    [texture, eff, box, transform?.scale],
  );
  if (!texture) return null;
  return (
    <Decal position={eff.position} rotation={eff.rotation} scale={scale} depthTest>
      <meshStandardMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-6} roughness={0.9} />
    </Decal>
  );
}

/** Single-sheet garments (apron): a plain projected decal also wraps the
 *  sheet's INNER faces, so the print shows through when viewed from behind.
 *  Build the projection manually and drop every triangle that faces away
 *  from the projector. */
function useSheetDecalGeometry(
  target: THREE.Mesh,
  placement: Placement,
  w: number,
  h: number,
): THREE.BufferGeometry | null {
  // Memoized on the NUMBERS, not on the `placement` object: `withTransform`
  // returns a fresh object whenever an offset is applied, so an identity-based
  // memo would rebuild a 13k-triangle DecalGeometry on every unrelated render.
  const geo = useMemo(() => {
    if (!target?.geometry) return null;
    target.updateMatrixWorld(true);
    const euler = new THREE.Euler(...placement.rotation);
    const geo = new DecalGeometry(
      target,
      new THREE.Vector3(...placement.position),
      euler,
      new THREE.Vector3(w, h, placement.depth),
    );
    const dir = new THREE.Vector3(0, 0, 1).applyEuler(euler);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const n = geo.attributes.normal as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const kp: number[] = [], kn: number[] = [], kuv: number[] = [];
    for (let i = 0; i < p.count; i += 3) {
      const nx = n.getX(i) + n.getX(i + 1) + n.getX(i + 2);
      const ny = n.getY(i) + n.getY(i + 1) + n.getY(i + 2);
      const nz = n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2);
      if (nx * dir.x + ny * dir.y + nz * dir.z <= 0) continue;
      for (let v = i; v < i + 3; v++) {
        kp.push(p.getX(v), p.getY(v), p.getZ(v));
        kn.push(n.getX(v), n.getY(v), n.getZ(v));
        kuv.push(uv.getX(v), uv.getY(v));
      }
    }
    geo.dispose();
    if (!kp.length) return null;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(kp, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(kn, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(kuv, 2));
    return out;
  }, [
    target,
    placement.position[0], placement.position[1], placement.position[2],
    placement.rotation[0], placement.rotation[1], placement.rotation[2],
    placement.depth, w, h,
  ]);
  // Unlike drei's <Decal>, nothing else frees the superseded geometry — dispose
  // here so a third caller cannot silently reintroduce the leak.
  useEffect(() => () => { geo?.dispose(); }, [geo]);
  return geo;
}

function SheetShirtDecal({ target, url, placement, box, transform }: { target: THREE.Mesh; url: string; placement: Placement; box?: GuideBox; transform?: DesignTransform }) {
  const texture = useArtworkTexture(url);
  const eff = useMemo(() => withTransform(placement, transform), [placement, transform]);
  const [dw, dh] = artworkScale(texture, eff, box, transform?.scale ?? 1);
  const geo = useSheetDecalGeometry(target, eff, dw, dh);
  if (!texture || !geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-6} roughness={0.9} />
    </mesh>
  );
}

function SheetGuideDecal({ target, placement, box, active, dark }: { target: THREE.Mesh; placement: Placement; box: GuideBox; active: boolean; dark: boolean }) {
  const color = active ? '#22c55e' : dark ? '#ffffff' : '#8b95a3';
  const texture = useMemo(() => makeGuideTexture(box.label, color, box.w / box.h), [box, color]);
  const geo = useSheetDecalGeometry(target, placement, box.w, box.h);
  if (!texture || !geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-8} roughness={0.9} />
    </mesh>
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
  mapUrl,
  strength = 1.3,
}: {
  color: THREE.Color;
  emissiveIntensity: number;
  normalMapUrl: string;
  roughMapUrl: string;
  /** Optional whitened detail/albedo map — multiplied by the selected colour,
   *  so seams and stitching stay visible on any fabric colour. */
  mapUrl?: string;
  strength?: number;
}) {
  const urls = useMemo(() => (mapUrl ? [normalMapUrl, roughMapUrl, mapUrl] : [normalMapUrl, roughMapUrl]), [normalMapUrl, roughMapUrl, mapUrl]);
  const textures = useLoader(THREE.TextureLoader, urls);
  const [normalMap, roughMap, baseMap] = textures;
  useMemo(() => {
    textures.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.flipY = false; // match glTF UV origin (top-left)
      t.colorSpace = i === 2 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
    });
  }, [textures]);
  const normalScale = useMemo(() => new THREE.Vector2(strength, strength), [strength]);
  return (
    <meshStandardMaterial
      color={color}
      emissive="#ffffff"
      emissiveIntensity={emissiveIntensity}
      roughness={0.97}
      metalness={0}
      map={baseMap ?? null}
      normalMap={normalMap}
      normalScale={normalScale}
      roughnessMap={roughMap}
      side={THREE.DoubleSide}
    />
  );
}

/** Two-tone trucker material. The base map is white on the front panels and
 *  black on the mesh/visor/straps. Compositing on a canvas — base, then a
 *  `lighten` fill with the selected colour (white stays white, black becomes
 *  the colour), then the AO map with `multiply` (bakes the mesh weave and
 *  stitch shading into the map) — gives a real trucker look: white front,
 *  coloured mesh, visible weave. */
function TwoToneCapMaterial({
  color,
  baseMapUrl,
  aoMapUrl,
  normalMapUrl,
  roughMapUrl,
  heightMapUrl,
  strength = 1.3,
}: {
  color: THREE.Color;
  baseMapUrl: string;
  aoMapUrl: string;
  normalMapUrl: string;
  roughMapUrl: string;
  heightMapUrl?: string;
  strength?: number;
}) {
  const [baseMap, aoMap, normalMap, roughMap, heightMap] = useLoader(THREE.TextureLoader, [
    baseMapUrl, aoMapUrl, normalMapUrl, roughMapUrl, heightMapUrl ?? baseMapUrl,
  ]);
  useMemo(() => {
    [normalMap, roughMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.flipY = false;
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
    });
  }, [normalMap, roughMap]);
  const map = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const img = baseMap.image as HTMLImageElement | undefined;
    const ao = aoMap.image as HTMLImageElement | undefined;
    const hgt = heightMapUrl ? (heightMap.image as HTMLImageElement | undefined) : undefined;
    if (!img?.width) return null;
    const canvas = document.createElement('canvas');
    // Compose at the HIGHEST source resolution — the mesh-weave cells in the
    // height map survive only at 2048; a 1024 canvas would average them away.
    const W = Math.max(img.width, hgt?.width ?? 0);
    const H = Math.max(img.height, hgt?.height ?? 0);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Brighten the base so the front panels read as crisp WHITE (the source
    // texture is a slightly gray off-white); black regions stay black.
    ctx.filter = 'brightness(1.3)';
    ctx.drawImage(img, 0, 0, W, H);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, W, H);
    if (ao?.width) {
      // Brighten the AO before multiplying so its broad shading no longer
      // grays the white front — only seams and panel joins keep darkening.
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = 'brightness(1.4)';
      ctx.drawImage(ao, 0, 0, W, H);
      ctx.filter = 'none';
    }
    if (hgt?.width) {
      // Pre-baked weave-shading map (high-pass of the 16-bit height map,
      // offline): white everywhere except the mesh weave holes and seams.
      // A straight multiply paints the weave onto the coloured panels without
      // touching the visor or straps (they're white in the map).
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(hgt, 0, 0, W, H);
      // Restore the front panels to pure white (weave/AO multiplies grayed
      // them slightly): lighten with the brightened base — white wins on the
      // front, black is a no-op on the coloured rest.
      ctx.globalCompositeOperation = 'lighten';
      ctx.filter = 'brightness(1.3)';
      ctx.drawImage(img, 0, 0, W, H);
      ctx.filter = 'none';
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false; // match glTF UV origin (top-left)
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }, [baseMap, aoMap, heightMap, heightMapUrl, color]);
  useEffect(() => {
    return () => { map?.dispose(); };
  }, [map]);
  const normalScale = useMemo(() => new THREE.Vector2(strength, strength), [strength]);
  if (!map) return <ShirtMaterial color={color} emissiveIntensity={0} />;
  return (
    // Fully matte: NO roughnessMap (the trucker's rough map has glossy patches
    // that put a strong sheen on the coloured mesh/visor and wash the colour
    // out) + reduced environment reflection. The colour stays true; the weave
    // still reads via the normal map.
    <meshStandardMaterial
      map={map}
      color="#ffffff"
      roughness={1}
      metalness={0}
      envMapIntensity={0.45}
      normalMap={normalMap}
      normalScale={normalScale}
      side={THREE.DoubleSide}
    />
  );
}

export interface ShirtDesign {
  area: string;
  url: string;
  transform?: DesignTransform;
}

interface Tshirt3DModelProps {
  color: string;
  designs: ShirtDesign[];
  showGuides?: boolean;
  activeArea?: string;
  /** The area being adjusted in the sketch tool. SEPARATE from `activeArea`,
   *  which drives guide highlighting and the `singleArea` filter (the caps). */
  editArea?: string;
  /** Consumed by the drag controller this component hosts (Task 5). */
  onCommit?: (area: string, t: DesignTransform) => void;
  variant?: ShirtVariant;
  modelUrl?: string;
}

export default function Tshirt3DModel({
  color,
  designs,
  showGuides,
  activeArea,
  editArea,
  variant = 'tshirt',
  modelUrl = '/models/tshirt-web.glb',
}: Tshirt3DModelProps) {
  const { scene } = useGLTF(modelUrl);
  const cfg = VARIANTS[variant] ?? VARIANTS.tshirt;
  const normalMapUrl = (cfg as { normalMapUrl?: string }).normalMapUrl;
  const roughMapUrl = (cfg as { roughMapUrl?: string }).roughMapUrl;
  const normalStrength = (cfg as { normalScale?: number }).normalScale;
  const baseMapUrl = (cfg as { baseMapUrl?: string }).baseMapUrl;
  const partRules = (cfg as { parts?: { match: string; kind: 'body' | 'silver' | 'black' }[] }).parts;
  const aoMapUrl = (cfg as { aoMapUrl?: string }).aoMapUrl;
  const heightMapUrl = (cfg as { heightMapUrl?: string }).heightMapUrl;
  const singleArea = (cfg as { singleArea?: boolean }).singleArea;
  const singleSheet = (cfg as { singleSheet?: boolean }).singleSheet;

  const shirtColor = useMemo(() => {
    const c = new THREE.Color(color);
    const mx = Math.max(c.r, c.g, c.b);
    if (mx < 0.12) c.setRGB(0.09, 0.093, 0.1);
    // Pure white blows out flat — pull it to a slight off-white so lit areas
    // stay bright while folds get real shading (depth).
    else if (c.r > 0.92 && c.g > 0.92 && c.b > 0.92) c.setRGB(0.95, 0.95, 0.96);
    // The cap's matte normal+roughness fabric mutes colours — lift saturation
    // and a touch of lightness so they read vivid.
    if (variant === 'cap') {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      c.setHSL(hsl.h, Math.min(1, hsl.s * 1.12), hsl.l);
    }
    return c;
  }, [color, variant]);

  // Dark fabrics get white area-guides instead of the low-contrast gray.
  const guideDark = useMemo(() => isDarkFabric(color as string), [color]);

  const emissiveIntensity = 0;

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

  // Measurement anchor for the drag controller: an empty object at the edited
  // area's BASE placement, inside its target mesh. It is the ONLY correct source
  // of world position/scale — the `meshes` clones are never added to the R3F
  // scene, so their matrixWorld reflects the glTF hierarchy (38.075 on the polo)
  // instead of the flattened one rendered here.
  const anchorRef = useRef<THREE.Object3D>(null);

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
            {(() => {
              if (partRules) {
                const matName = ((mesh.material as THREE.Material | undefined)?.name) || mesh.name || '';
                const kind = partRules.find(r => matName.includes(r.match))?.kind ?? 'body';
                if (kind === 'silver') {
                  return <meshStandardMaterial color="#d4d4d4" roughness={0.35} metalness={0.55} side={THREE.DoubleSide} />;
                }
                if (kind === 'black') {
                  return <meshStandardMaterial color="#181818" roughness={0.9} metalness={0.05} side={THREE.DoubleSide} />;
                }
                return <ShirtMaterial color={shirtColor} emissiveIntensity={emissiveIntensity} />;
              }
              return null;
            })() || (baseMapUrl && aoMapUrl && normalMapUrl && roughMapUrl ? (
              <TwoToneCapMaterial
                color={shirtColor}
                baseMapUrl={baseMapUrl}
                aoMapUrl={aoMapUrl}
                normalMapUrl={normalMapUrl}
                roughMapUrl={roughMapUrl}
                heightMapUrl={heightMapUrl}
                strength={normalStrength}
              />
            ) : normalMapUrl && roughMapUrl ? (
              <TexturedMaterial
                color={shirtColor}
                emissiveIntensity={emissiveIntensity}
                normalMapUrl={normalMapUrl}
                roughMapUrl={roughMapUrl}
                mapUrl={baseMapUrl}
                strength={normalStrength}
              />
            ) : (
              <ShirtMaterial color={shirtColor} emissiveIntensity={emissiveIntensity} />
            ))}
            {designs.map((d) => {
              const placement = cfg.areas[d.area];
              if (!placement || !d.url || targetFor(d.area) !== mesh) return null;
              return singleSheet
                ? <SheetShirtDecal key={d.area} target={mesh} url={d.url} placement={placement} box={cfg.guides[d.area]} transform={d.transform} />
                : <ShirtDecal key={d.area} url={d.url} placement={placement} box={cfg.guides[d.area]} transform={d.transform} />;
            })}
            {/* No transform on the anchor: it feeds only distance-to-camera and
                world scale, and a full ±0.35 offset moves the camera distance
                by 0.2%. The base placement keeps the drag gain constant. */}
            {editArea && cfg.areas[editArea] && targetFor(editArea) === mesh && (
              <object3D ref={anchorRef} position={cfg.areas[editArea].position} />
            )}
            {showGuides
              ? guideAreas
                  .filter(
                    (a) =>
                      // The edited area keeps its (untransformed) guide as the
                      // printable-area reference, even once artwork is uploaded
                      // and even on the singleArea caps, which never receive an
                      // `activeArea` from the sketch page.
                      (!uploaded.has(a) || a === editArea) &&
                      cfg.areas[a] &&
                      targetFor(a) === mesh &&
                      (!singleArea || a === activeArea || a === editArea)
                  )
                  .map((a) =>
                    singleSheet ? (
                      <SheetGuideDecal key={`guide-${a}`} target={mesh} placement={cfg.areas[a]} box={cfg.guides[a]} active={a === activeArea} dark={guideDark} />
                    ) : (
                      <GuideDecal key={`guide-${a}`} placement={cfg.areas[a]} box={cfg.guides[a]} active={a === activeArea} dark={guideDark} />
                    )
                  )
              : null}
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Warm every 3D model into the loader cache. Called by the DESIGNER pages
 * (where the user may switch between types) — NOT at module scope, because
 * the public share page also imports this module and must download ONLY the
 * one model it shows (the ~35MB preload storm starved the design-texture
 * request and the sketch appeared without its artwork).
 */
export function preloadAllModels(): void {
  useGLTF.preload('/models/tshirt-web.glb');
  useGLTF.preload('/models/polo-web.glb');
  useGLTF.preload('/models/oversized-web.glb');
  useGLTF.preload('/models/cap-web.glb');
  useGLTF.preload('/models/sweatshirt-web.glb');
  useGLTF.preload('/models/hoodie-web.glb');
  useGLTF.preload('/models/ziphoodie-web.glb');
  useGLTF.preload('/models/tote-volume-web.glb');
  useGLTF.preload('/models/meshcap-web.glb');
  useGLTF.preload('/models/buff-web.glb');
  useGLTF.preload('/models/vest-web.glb');
  useGLTF.preload('/models/baby-web.glb');
  useGLTF.preload('/models/apron-web.glb');
  useGLTF.preload('/models/dsbag-web.glb');
}
