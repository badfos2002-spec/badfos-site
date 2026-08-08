'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { DEFAULT_TRANSFORM, DesignTransform, clampTransform } from './decalTransform';

/** The placement the CURRENT decal geometry was baked with: the area's base
 *  placement plus the offset that has ALREADY been committed. */
export type BakedPlacement = {
  position: [number, number, number];
  rotation: [number, number, number];
};

/** Live-preview driver for the controls that are not the canvas drag (the size
 *  slider). It runs the same imperative path, so a slider step costs no
 *  reprojection — 248 ms per step on the t-shirt otherwise. */
export type DecalPreviewFn = (live: DesignTransform) => void;

interface DecalDragControllerProps {
  area: string;
  /** Empty object at the area's BASE placement, inside the target mesh. The
   *  only correct source of world position/scale — the `meshes` clones are
   *  never added to the R3F scene (spec §5.3). */
  anchorRef: React.RefObject<THREE.Object3D>;
  /** The rendered decal mesh. Null while the texture (and, on the apron, the
   *  sheet geometry) loads, so every read must tolerate it. */
  meshRef: React.MutableRefObject<THREE.Mesh | null>;
  baked: BakedPlacement;
  /** The transform already baked into `baked` and into `artworkScale`. */
  transform: DesignTransform;
  onCommit?: (area: string, t: DesignTransform) => void;
  /** Filled with the live-preview driver while mounted, cleared on unmount. */
  previewRef?: React.MutableRefObject<DecalPreviewFn | null>;
}

/**
 * Turns canvas drags into a `DesignTransform` for the area being edited.
 *
 * `DecalGeometry` re-slices EVERY triangle of the target mesh — 340,513 of them
 * on the t-shirt, 248 ms a rebuild — so a reprojection per `pointermove` runs at
 * 4 fps. Instead the drag moves the decal MESH imperatively (drei leaves it at
 * identity: `position`/`rotation`/`scale` are destructured out and used only to
 * build the geometry, Decal.js:26-28), and a single real reprojection happens on
 * release. Spec §5.4.
 *
 * Renders nothing.
 */
export default function DecalDragController({
  area,
  anchorRef,
  meshRef,
  baked,
  transform,
  onCommit,
  previewRef,
}: DecalDragControllerProps) {
  const gl = useThree((s) => s.gl);
  // `get()` returns LIVE state. Reading `camera`/`size` off `useThree()` and
  // closing over them inside a [gl]-dep effect captures render 1 — `size` then
  // goes stale on the first canvas resize and the drag gain is wrong.
  const get = useThree((s) => s.get);

  // The pointer effect registers once; everything it needs from props is read
  // through this ref, refreshed after every commit.
  const propsRef = useRef({ area, baked, transform, onCommit });
  useEffect(() => {
    propsRef.current = { area, baked, transform, onCommit };
  });

  // The mesh the preview last wrote to. React detaches `meshRef` during the same
  // commit that unmounts this controller, so a preview interrupted by an unmount
  // (edit area cleared mid-drag, or a slider preview abandoned by leaving edit
  // mode) could otherwise never be undone — same failure `pointercancel` exists
  // to prevent, and with the same consequence: the canvas shows one thing while
  // React state and Firestore hold another.
  const touchedRef = useRef<THREE.Mesh | null>(null);

  // One set of scratch objects per controller, reused every pointermove.
  const scratch = useRef({
    offset: new THREE.Vector3(),
    euler: new THREE.Euler(),
    world: new THREE.Vector3(),
    scale: new THREE.Vector3(),
  }).current;

  /**
   * Reproduce `v' = P + D + R·diag(sRel, sRel, 1)·Rᵀ·(v − P)` on the decal mesh.
   * Every rotation in VARIANTS is I or R_y(π) (spec §4.1.1), so the conjugation
   * collapses to `diag(sRel, sRel, 1)` — the mesh's own local scale.
   *
   * `committed` is the state the geometry was baked with; `live` is the
   * in-flight value, ALREADY CLAMPED.
   */
  const preview = useCallback(
    (committed: DesignTransform, live: DesignTransform, bakedNow: BakedPlacement) => {
      const mesh = meshRef.current;
      if (!mesh) return;
      touchedRef.current = mesh;
      const P = bakedNow.position;
      // RELATIVE: the committed scale is already baked in through `artworkScale`,
      // and the committed offset already sits inside P. Absolute values give
      // 1.4 × 1.5 = 2.1 and a jump on the second adjustment.
      const sRel = live.scale / (committed.scale || 1);
      const D = scratch.offset
        .set(live.dx - committed.dx, live.dy - committed.dy, 0)
        // REQUIRED: without it, dragging right on `back` (R_y(π)) moves the
        // design LEFT — the bug the whole design exists to prevent.
        .applyEuler(scratch.euler.set(bakedNow.rotation[0], bakedNow.rotation[1], bakedNow.rotation[2]));
      // NOT setScalar: diag(s,s,s) also displaces along the projector's z, and on
      // the t-shirt `front_full` a flank vertex reaches z = −0.058 at s = 1.3 —
      // inside the fabric, occluded by depthTest, so the artwork evaporates.
      mesh.scale.set(sRel, sRel, 1);
      mesh.position.set(
        P[0] * (1 - sRel) + D.x,
        P[1] * (1 - sRel) + D.y,
        D.z, // z is not scaled → no (1 − sRel) term
      );
    },
    [meshRef, scratch],
  );

  /** Drop the preview and put the mesh back where drei/`useSheetDecalGeometry`
   *  left it, so React state and what the canvas shows agree again. */
  const resetPreview = useCallback(() => {
    const mesh = meshRef.current ?? touchedRef.current;
    if (mesh) {
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
    }
    touchedRef.current = null;
  }, [meshRef]);

  // Nothing else can undo a preview once this controller is gone.
  useEffect(() => () => resetPreview(), [resetPreview]);

  // The slider drives the same imperative path against the CURRENT committed
  // props (it has no pointerdown snapshot of its own).
  useEffect(() => {
    if (!previewRef) return;
    previewRef.current = (live) => {
      const p = propsRef.current;
      preview(p.transform, clampTransform(live), p.baked);
    };
    return () => {
      previewRef.current = null;
    };
  }, [previewRef, preview]);

  useEffect(() => {
    const el = gl.domElement;

    let active = false;
    let x0 = 0;
    let y0 = 0;
    let unitsPerPx = 0;
    let committed: DesignTransform = DEFAULT_TRANSFORM;
    let live: DesignTransform = DEFAULT_TRANSFORM;
    let bakedAtDown: BakedPlacement = propsRef.current.baked;

    /**
     * px → local model units. `Bounds fit` moves the CAMERA and never scales the
     * object, and without `observe` it fits exactly once per mount — so this is
     * read at pointerdown rather than memoised at render time. Reading it ONCE
     * per drag also keeps the gain constant while the design moves.
     */
    const measureUnitsPerPx = (): number => {
      const { camera, size } = get();
      // RootState.camera is Orthographic | Perspective and `.fov` does not exist
      // on the union — without this narrowing `tsc` fails.
      if (!(camera instanceof THREE.PerspectiveCamera)) return 0;
      const anchor = anchorRef.current;
      if (!anchor || !size.height) return 0;
      const dist = camera.position.distanceTo(anchor.getWorldPosition(scratch.world));
      const visibleH = 2 * Math.tan(((camera.fov * Math.PI) / 180) / 2) * dist;
      // ≈ 1 for every variant (normScale × mesh.scale ≈ 1). A polo reading near
      // 38 would mean the glTF clone was measured instead of the anchor.
      const worldScale = anchor.getWorldScale(scratch.scale).y || 1;
      // `size.height` is CSS px — the same unit as clientX/clientY. NOT
      // `gl.domElement.height`, which is device px (×2 on retina).
      return visibleH / size.height / worldScale;
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const upp = measureUnitsPerPx();
      // A drag with no scale would silently do nothing — refuse it instead.
      if (!upp) return;
      const p = propsRef.current;
      active = true;
      x0 = e.clientX;
      y0 = e.clientY;
      unitsPerPx = upp;
      committed = p.transform ?? DEFAULT_TRANSFORM;
      live = committed;
      bakedAtDown = p.baked;
    };

    const move = (e: PointerEvent) => {
      if (!active) return;
      // TOTAL delta since pointerdown, NOT the per-move increment `Turntable`
      // uses: `committed.dx + mx * upp` only holds for a cumulative mx. Totals
      // are also what makes the clamp behave — drag back off the rail and the
      // design responds instantly instead of eating the over-travel.
      const mx = e.clientX - x0;
      const my = e.clientY - y0;
      // Clamp the LIVE values as they accumulate. Clamping only at commit lets
      // the artwork follow the pointer past the limit and snap back on release.
      live = clampTransform({
        dx: committed.dx + mx * unitsPerPx,
        dy: committed.dy - my * unitsPerPx, // screen y grows downward
        scale: committed.scale,
      });
      preview(committed, live, bakedAtDown);
    };

    const up = () => {
      if (!active) return;
      active = false;
      if (live.dx === committed.dx && live.dy === committed.dy && live.scale === committed.scale) return;
      const p = propsRef.current;
      p.onCommit?.(p.area, live);
    };

    // Mandatory, not defensive: an interrupted drag (system gesture, focus loss,
    // browser-cancelled pointer) fires no pointerup, so without this the
    // imperative transform stays on the mesh forever while React state holds
    // something else.
    const cancel = () => {
      if (!active) return;
      active = false;
      resetPreview();
    };

    // pointerdown on the canvas, the rest on window: ±0.35 ≈ ±70 px, so the
    // pointer routinely outruns the design and leaves the canvas. No
    // setPointerCapture — R3F installs its own pointer handling on this element.
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [gl, get, anchorRef, meshRef, preview, resetPreview, scratch]);

  return null;
}
