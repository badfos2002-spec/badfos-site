import * as THREE from 'three';

/** Per-area adjustment the admin applies in the sketch tool. Offsets are in the
 *  decal projector's OWN rotated frame, so "+dx = right on screen" holds for
 *  every area — including `back`, whose projector is rotated 180°. */
export type DesignTransform = {
  dx: number;
  dy: number;
  /** Multiplier on the fitted artwork size. 1 = the hardcoded default. */
  scale: number;
};

export const DEFAULT_TRANSFORM: DesignTransform = { dx: 0, dy: 0, scale: 1 };

/** Safety rail, NOT a printable-area constraint — see spec §5.5. It stops the
 *  artwork being dragged clear of the mesh (where the decal silently vanishes),
 *  but it does not keep the print inside the garment. */
export const MAX_OFFSET = 0.35;
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 2.0;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampTransform(t: DesignTransform): DesignTransform {
  return {
    dx: clamp(t.dx, -MAX_OFFSET, MAX_OFFSET),
    dy: clamp(t.dy, -MAX_OFFSET, MAX_OFFSET),
    scale: clamp(t.scale, MIN_SCALE, MAX_SCALE),
  };
}

export function isDefaultTransform(t?: DesignTransform): boolean {
  return !t || (t.dx === 0 && t.dy === 0 && t.scale === 1);
}

type PlacementLike = {
  position: [number, number, number];
  rotation: [number, number, number];
};

/**
 * Offset a placement inside the projector's own frame.
 *
 * Returning the ORIGINAL OBJECT when there is no offset is functional, not an
 * optimisation: `useSheetDecalGeometry` and drei's `<Decal>` both key work off
 * these values, and preserving identity keeps untouched sketches free.
 */
export function withTransform<T extends PlacementLike>(p: T, t?: DesignTransform): T {
  if (!t || (t.dx === 0 && t.dy === 0)) return p;
  const off = new THREE.Vector3(t.dx, t.dy, 0).applyEuler(new THREE.Euler(...p.rotation));
  return {
    ...p,
    position: [p.position[0] + off.x, p.position[1] + off.y, p.position[2] + off.z],
  };
}
