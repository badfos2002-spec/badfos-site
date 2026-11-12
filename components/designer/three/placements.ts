/* ------------------------------------------------------------------ *
 * TUNABLE CONSTANTS — adjust after seeing each model on the page.
 * Placements are in the target mesh's normalized local space.
 *
 * PURE DATA MODULE: no three / drei / R3F imports, so the tables (and the
 * helpers below them) can be unit-tested — `Tshirt3DModel.tsx` itself cannot be
 * imported in jsdom because of `useGLTF`.
 * ------------------------------------------------------------------ */

import { normalizeAngle } from './previewMath';


export const MODEL: {
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
} = { scale: 1, rotation: [0, 0, 0], position: [0, 0, 0] };

export type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number; // max artwork extent (real w/h from image aspect → no stretch)
  depth: number; // projector depth across the curved surface
  /** Which panel to project onto (multi-panel models — the polo). The sleeves
   *  are separate primitives there, so a shoulder must name its own. */
  panel?: 'front' | 'back' | 'sleeveRight' | 'sleeveLeft';
};
export type GuideBox = { w: number; h: number; label: string };

/* SHOULDERS (TICKET-004). Convention, shared with `chest_logo` (`סמל כיס ימין`
 * at x = −0.27) and pinned by PR A's tests: the WEARER's right is at NEGATIVE
 * local x = the viewer's left on a front view. A projector facing outward along
 * −x therefore has rotation [0, −π/2, 0] (R_y(−π/2) maps +z → −x), and the left
 * shoulder is its exact mirror. The rotation stays an axis-aligned quarter turn
 * with NO tilt: `previewMath` is only diagonal there.
 *
 * Every y/z below STARTED as the median of the sideways-facing surface patch
 * (normal.x > 0.75) of the real GLB in the upper-sleeve band, with x the middle
 * of that patch's own x spread, measured per model — then checked on screen and
 * nudged where the box did not sit square on the sleeve. `depth` is kept well
 * below the chest-logo depth: the sleeve is a thin tube, and a deep projector
 * would also paint the far wall. */

// TSHIRT — a single body mesh (front +z / back −z live on the same mesh).
const TSHIRT_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.68, depth: 0.55 },
  back: { position: [0, 0.14, -0.3], rotation: [0, Math.PI, 0], size: 0.92, depth: 0.55 },
  chest_logo: { position: [-0.27, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  chest_logo_right: { position: [0.27, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  // Same row as the side logos (matches the 2D overlay); centre neckline is at y≈0.84, well clear.
  chest_logo_center: { position: [0, 0.58, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  center: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  center_wide: { position: [0, 0.16, 0.3], rotation: [0, 0, 0], size: 0.72, depth: 0.55 },
  // Lower sleeve, just above the hem (TICKET-007 — it used to hug the shoulder
  // seam at y 0.59). The hem ring is at y≈0.27; the sleeve flares outward going
  // down (outermost x −0.80 at y 0.36), so x moved out with y to keep the
  // projector box over the sleeve's outer wall — otherwise the box foreshortens
  // off the leading edge. Nudged on screen until the print sat square.
  shoulder_right: { position: [-0.73, 0.36, -0.09], rotation: [0, -Math.PI / 2, 0], size: 0.16, depth: 0.22 },
  shoulder_left: { position: [0.73, 0.36, -0.09], rotation: [0, Math.PI / 2, 0], size: 0.16, depth: 0.22 },
};
const TSHIRT_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.62, h: 0.68, label: 'קדמי מלא' },
  back: { w: 0.72, h: 0.92, label: 'גב' },
  chest_logo: { w: 0.17, h: 0.17, label: 'סמל ימין' },
  chest_logo_right: { w: 0.17, h: 0.17, label: 'סמל שמאל' },
  chest_logo_center: { w: 0.17, h: 0.17, label: 'סמל אמצעי' },
  shoulder_right: { w: 0.17, h: 0.17, label: 'כתף ימין' },
  shoulder_left: { w: 0.17, h: 0.17, label: 'כתף שמאל' },
};

// POLO — separate front panel (local z ∈ [-0.15,0.46]) and back panel
// (local z ∈ [-0.46,0]). Front artwork projects +z onto the front panel,
// back artwork projects −z onto the back panel.
const POLO_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.08, 0.36], rotation: [0, 0, 0], size: 0.52, depth: 0.5, panel: 'front' },
  back: { position: [0, 0.12, -0.36], rotation: [0, Math.PI, 0], size: 0.71, depth: 0.5, panel: 'back' },
  chest_logo: { position: [-0.24, 0.44, 0.34], rotation: [0, 0, 0], size: 0.22, depth: 0.4, panel: 'front' },
  chest_logo_right: { position: [0.24, 0.44, 0.34], rotation: [0, 0, 0], size: 0.22, depth: 0.4, panel: 'front' },
  // The polo's sleeves are their OWN primitives (xc ≈ ∓0.59), so each shoulder
  // names its sleeve — the panel scoring would otherwise send it to the chest.
  // Lowered to just above the sleeve hem (TICKET-007; was y 0.52), checked on
  // screen.
  shoulder_right: { position: [-0.66, 0.24, -0.17], rotation: [0, -Math.PI / 2, 0], size: 0.2, depth: 0.22, panel: 'sleeveRight' },
  shoulder_left: { position: [0.66, 0.24, -0.17], rotation: [0, Math.PI / 2, 0], size: 0.2, depth: 0.22, panel: 'sleeveLeft' },
};
const POLO_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.4, h: 0.5, label: 'קדמי מלא' },
  back: { w: 0.575, h: 0.71, label: 'גב' },
  chest_logo: { w: 0.2, h: 0.2, label: 'סמל ימין' },
  chest_logo_right: { w: 0.2, h: 0.2, label: 'סמל שמאל' },
  shoulder_right: { w: 0.2, h: 0.2, label: 'כתף ימין' },
  shoulder_left: { w: 0.2, h: 0.2, label: 'כתף שמאל' },
};

// OVERSIZED — one wide body mesh (local x ∈ [-1,1], front +z). Like the tshirt
// but baggier, so artwork sits a touch lower/larger and logos spread wider.
const OVERSIZED_AREAS: Record<string, Placement> = {
  front_full: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.66, depth: 0.55 },
  back: { position: [0, 0.11, -0.3], rotation: [0, Math.PI, 0], size: 0.74, depth: 0.55 },
  // Chest row at 0.55 so its bottom edge (guide h 0.18 → 0.46) clears front_full's top (0.13 + 0.64/2 = 0.45).
  chest_logo: { position: [-0.3, 0.55, 0.28], rotation: [0, 0, 0], size: 0.17, depth: 0.45 },
  chest_logo_right: { position: [0.3, 0.55, 0.28], rotation: [0, 0, 0], size: 0.17, depth: 0.45 },
  chest_logo_center: { position: [0, 0.55, 0.28], rotation: [0, 0, 0], size: 0.17, depth: 0.45 },
  center: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.66, depth: 0.55 },
  center_wide: { position: [0, 0.13, 0.3], rotation: [0, 0, 0], size: 0.78, depth: 0.55 },
  // Lower sleeve, just above the hem (TICKET-007; was y 0.58). The baggy sleeve
  // slopes out ~0.05 in x per 0.1 in y (outer wall x −0.83 at y 0.40, −0.89 at
  // 0.30), so the box is centred on that wall; any lower and the wall bulges past
  // the projector depth, any further out and the top corner misses the sleeve.
  shoulder_right: { position: [-0.8, 0.32, -0.03], rotation: [0, -Math.PI / 2, 0], size: 0.17, depth: 0.24 },
  shoulder_left: { position: [0.8, 0.32, -0.03], rotation: [0, Math.PI / 2, 0], size: 0.17, depth: 0.24 },
};
const OVERSIZED_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.54, h: 0.64, label: 'קדמי מלא' },
  back: { w: 0.6, h: 0.74, label: 'גב' },
  chest_logo: { w: 0.18, h: 0.18, label: 'סמל ימין' },
  chest_logo_right: { w: 0.18, h: 0.18, label: 'סמל שמאל' },
  chest_logo_center: { w: 0.18, h: 0.18, label: 'סמל אמצעי' },
  shoulder_right: { w: 0.18, h: 0.18, label: 'כתף ימין' },
  shoulder_left: { w: 0.18, h: 0.18, label: 'כתף שמאל' },
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
  // Same row as the side logos (matches the 2D overlay).
  chest_logo_center: { position: [0, 0.46, 0.31], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  center: { position: [0, 0.06, 0.33], rotation: [0, 0, 0], size: 0.56, depth: 0.55 },
  center_wide: { position: [0, 0.06, 0.33], rotation: [0, 0, 0], size: 0.68, depth: 0.55 },
  // Long sleeves (TICKET-007; was y 0.5): the SAME spot on the arm as the
  // lowered tee print — bicep level, where a t-shirt sleeve ends, not the cuff.
  // Measured from the top of the sleeve, the tee print sits ~22% of the garment's
  // height down (0.80 → 0.36 of 2.0); here the sleeve starts at y≈0.50–0.55 and
  // the garment is 1.7 tall, so ~0.18. The outer wall there is x −0.73..−0.76
  // across hoodie/crewneck/zip, so x −0.67 with depth 0.22 covers all three;
  // z 0 sits between the crewneck's patch (z≈−0.07) and the zip's (z≈0.10).
  shoulder_right: { position: [-0.67, 0.18, 0], rotation: [0, -Math.PI / 2, 0], size: 0.16, depth: 0.22 },
  shoulder_left: { position: [0.67, 0.18, 0], rotation: [0, Math.PI / 2, 0], size: 0.16, depth: 0.22 },
};
const HOODIE_GUIDES: Record<string, GuideBox> = {
  front_full: { w: 0.48, h: 0.58, label: 'קדמי מלא' },
  back: { w: 0.55, h: 0.66, label: 'גב' },
  chest_logo: { w: 0.18, h: 0.18, label: 'סמל ימין' },
  chest_logo_right: { w: 0.18, h: 0.18, label: 'סמל שמאל' },
  chest_logo_center: { w: 0.18, h: 0.18, label: 'סמל אמצעי' },
  shoulder_right: { w: 0.18, h: 0.18, label: 'כתף ימין' },
  shoulder_left: { w: 0.18, h: 0.18, label: 'כתף שמאל' },
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
  // The zipper changes nothing on the sleeves — but this list is hand-written,
  // so an area missing HERE is silently never rendered on the zip hoodie.
  shoulder_right: HOODIE_AREAS.shoulder_right,
  shoulder_left: HOODIE_AREAS.shoulder_left,
};
const ZIP_GUIDES: Record<string, GuideBox> = {
  back: HOODIE_GUIDES.back,
  chest_logo: HOODIE_GUIDES.chest_logo,
  chest_logo_right: HOODIE_GUIDES.chest_logo_right,
  shoulder_right: HOODIE_GUIDES.shoulder_right,
  shoulder_left: HOODIE_GUIDES.shoulder_left,
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

export const VARIANTS = {
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

/* ------------------------------------------------------------------ *
 * Pure helpers over the tables above.
 * ------------------------------------------------------------------ */

/**
 * The turntable angle that makes `area` face the camera.
 *
 * The turntable sets the group's `rotation.y`, and an area faces the camera when
 * that rotation maps the projector's outward axis onto +z — i.e. the angle is
 * `−placement.rotation.y`. That is 0 for every front area and π for `back`
 * (exactly what this replaced), and ±π/2 for the shoulders. An unknown variant
 * or an area the variant cannot print faces the front, the old fallback.
 */
export function angleForArea(variant: ShirtVariant | undefined, area: string | undefined): number {
  if (!variant || !area) return 0;
  const areas = (VARIANTS[variant] as { areas: Record<string, Placement | undefined> } | undefined)?.areas;
  const placement = areas?.[area];
  if (!placement) return 0;
  return normalizeAngle(-placement.rotation[1]);
}

/** A target mesh reduced to what the panel rule scores: the centre of its
 *  bounding box in x and z, and its vertex count. */
export type MeshSummary = { xc: number; zc: number; count: number };

/**
 * Which mesh a placement projects onto, on a multi-panel model (the polo, whose
 * front, back and two sleeves are separate primitives). Returns an index into
 * `meshes` — which arrives sorted by vertex count, descending, so index 0 is the
 * body — or −1 when there is nothing to pick.
 *
 * Front/back keep the original rule: the largest mesh whose bounding box centre
 * is on that side of z, falling back to index 0. A sleeve is a mesh that is
 * clearly off-centre in x on the asked-for side; "clearly" is measured RELATIVE
 * to the widest candidate, so the rule reads the same in normalized units and in
 * raw glTF ones, and the panels themselves are never candidates. No sleeve in
 * the list → the front panel, so a decal can never silently vanish.
 */
export function pickPanel(meshes: MeshSummary[], panel?: Placement['panel']): number {
  if (!meshes.length) return -1;
  const largest = (pred: (m: MeshSummary) => boolean): number => {
    let best = -1;
    for (let i = 0; i < meshes.length; i++) {
      if (!pred(meshes[i])) continue;
      if (best < 0 || meshes[i].count > meshes[best].count) best = i;
    }
    return best;
  };
  const front = largest((m) => m.zc >= 0);
  const back = largest((m) => m.zc < 0);
  if (panel === 'back') return back >= 0 ? back : 0;
  if (panel === 'sleeveRight' || panel === 'sleeveLeft') {
    const sign = panel === 'sleeveRight' ? -1 : 1;
    let maxAbs = 0;
    for (let i = 0; i < meshes.length; i++) {
      if (i === front || i === back) continue;
      maxAbs = Math.max(maxAbs, Math.abs(meshes[i].xc));
    }
    let best = -1;
    for (let i = 0; i < meshes.length; i++) {
      if (i === front || i === back) continue;
      if (Math.sign(meshes[i].xc) !== sign) continue;
      if (Math.abs(meshes[i].xc) < 0.5 * maxAbs) continue;
      if (best < 0 || meshes[i].count > meshes[best].count) best = i;
    }
    if (best >= 0) return best;
  }
  return front >= 0 ? front : 0;
}
