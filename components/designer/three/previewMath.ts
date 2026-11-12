/**
 * Live-preview maths for the decal drag / size slider. Pure (no three), so it
 * is unit-testable — see `tests/three-preview-math.test.ts`.
 */

/** An angle folded into (−π, π], with −π landing on +π. */
export function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  const x = ((a % twoPi) + twoPi) % twoPi;
  return x > Math.PI ? x - twoPi : x;
}

/** A projector turned a quarter turn about Y and not tilted: its decal plane is
 *  the local y–z plane, so the scaling happens in y and z. */
function isSideways(rotation: [number, number, number]): boolean {
  if (rotation[0] !== 0 || rotation[2] !== 0) return false;
  return Math.abs(Math.abs(normalizeAngle(rotation[1])) - Math.PI / 2) < 1e-9;
}

/**
 * Reproduce `v' = P + D + R·diag(sRel, sRel, 1)·Rᵀ·(v − P)` on a decal mesh that
 * carries the BAKED geometry at identity rotation (drei's `<Decal>` consumes
 * `position`/`rotation`/`scale` to build the geometry and leaves the mesh at
 * identity), using only the mesh's own scale and position.
 *
 * With `M = R·diag(sRel, sRel, 1)·Rᵀ` the move is `position_i = P_i·(1 − M_ii) + D_i`,
 * and at axis-aligned quarter turns `M` stays diagonal:
 *
 * | `rotation[1]` | mesh scale  | position                                  |
 * |---------------|-------------|-------------------------------------------|
 * | `0` / `±π`    | `(s, s, 1)` | `[P₀(1−s), P₁(1−s), 0] + D`               |
 * | `±π/2`        | `(1, s, s)` | `[0, P₁(1−s), P₂(1−s)] + D`               |
 *
 * `d` is the drag delta ALREADY rotated into the projector's frame. Anything
 * that is not an axis-aligned quarter turn (a tilt, an arbitrary yaw) falls back
 * to the first row — the behaviour before the shoulders existed — so a future
 * placement can never crash the preview, only approximate it.
 *
 * NOT `setScalar`: `diag(s,s,s)` also displaces along the projector's z, and on
 * the t-shirt `front_full` a flank vertex reaches z = −0.058 at s = 1.3 — inside
 * the fabric, occluded by depthTest, so the artwork evaporates.
 */
export function previewScaleAndPosition(
  position: [number, number, number],
  rotation: [number, number, number],
  sRel: number,
  d: [number, number, number],
): { scale: [number, number, number]; position: [number, number, number] } {
  if (isSideways(rotation)) {
    return {
      scale: [1, sRel, sRel],
      position: [d[0], position[1] * (1 - sRel) + d[1], position[2] * (1 - sRel) + d[2]],
    };
  }
  return {
    scale: [sRel, sRel, 1],
    position: [position[0] * (1 - sRel) + d[0], position[1] * (1 - sRel) + d[1], d[2]],
  };
}
