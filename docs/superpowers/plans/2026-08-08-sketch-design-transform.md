# Sketch Design Transform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin drag and resize an uploaded design on the 3D garment in `/admin/sketches`, and persist that adjustment so the customer sees it in the share link.

**Architecture:** A per-area `DesignTransform {dx, dy, scale}` offsets the existing `Decal` projector **within its own rotated frame**, so one formula works for every variant and every area including `back`. Because `DecalGeometry` rebuilds cost up to 248 ms on the t-shirt, the drag renders a **live imperative preview** on the decal mesh (which drei leaves at identity transform) and performs a single real reprojection on release.

**Tech Stack:** Next.js 14 App Router, TypeScript, three.js 0.169, @react-three/fiber 8, @react-three/drei 9, Firestore.

**Spec:** [docs/superpowers/specs/2026-08-08-sketch-design-transform-design.md](../specs/2026-08-08-sketch-design-transform-design.md) — read §4.1.1, §5.2, §5.3 and §5.4 before writing any code. They document four bugs that pass a casual test and then break.

---

## Testing Reality — read this first

**This repo has no unit-test framework.** No jest, no vitest, no `test` script in [package.json](../../../package.json). Do **not** add one — testing WebGL decal projection in jsdom is not feasible, and the spec's acceptance criteria are visual and performance-based.

Verification for every task is therefore:

| Gate | Command |
|---|---|
| Types | `npx tsc --noEmit` |
| Build | `npm run build` |
| Behaviour | Drive a real browser via `playwright-core` (v1.62.1, already installed; Chromium cached in `~/Library/Caches/ms-playwright`) against `npm run dev` |

> **`npm run lint` is not a usable gate in this repo.** There is no `.eslintrc*` on disk or in `git ls-files`, so `next lint` drops into an interactive scaffold prompt and hangs forever. Verified. Do **not** add an ESLint config to fix this — it is pre-existing, out of scope, and would surface ~200 pre-existing errors. To lint a single new file, create a temporary `.eslintrc.json` with `{"extends": ["next/core-web-vitals", "next/typescript"]}`, run `npx next lint --dir <path>`, then **delete it**. (`next/typescript` is required, or every `@typescript-eslint/*` disable-comment in the repo errors as "rule not found".)

**One exception — pure functions get real tests.** `decalTransform.ts` (Task 1) contains the offset and clamp math with no three.js scene dependency. It is verified with a standalone `npx tsx` assertion script in the scratchpad. This is the only place where test-first is both possible and worth it, and it is where the highest-risk bugs live.

Browser driver scripts live in the **scratchpad**, not the repo: `/private/tmp/claude-501/-Users-mac-Desktop-badfos-site/b512a8a4-5871-4516-8b61-e36c446c20f8/scratchpad/`. Do not commit them.

### ⛔ `/admin/sketches` is unreachable locally — verified

Three compounding facts, each confirmed against the source:

1. The real gate is [`app/admin/AdminLayout.tsx`](../../../app/admin/AdminLayout.tsx), **not** `hooks/useAuth.ts`. That hook is imported by nothing but itself — pre-existing dead code. **Do not delete it as part of this work.**
2. Admin sign-in is a Firebase **Google OAuth popup** hard-restricted to `badfos2002@gmail.com` ([`lib/auth.ts:31-40`](../../../lib/auth.ts#L31-L40)). No password path, no dev bypass — Playwright cannot complete it.
3. `.env.local` contains **zero** `NEXT_PUBLIC_FIREBASE_*` keys, so `isFirebaseConfigured === false`, `onAuthChange` is a no-op, and `AdminLayout` redirects to `/admin/login`, where sign-in throws "Firebase is not configured".

**The approved resolution (decided with the owner):**

- **Tasks 0-6 and 8** verify through a **temporary unauthenticated scratch route** (Task 0) that mounts `Preview3DStage` with the same props the admin page passes. No auth, no Firebase, no secrets. It is deleted before the final commit.
- **Task 7 only** — the Firestore round-trip and share link — runs after `vercel env pull`, **which must back up the existing `.env.local` first** (it holds `WEBHOOK_SECRET`, `TELEGRAM_*` and `GROW_WEBHOOK_KEY` that a pull may clobber). Note this writes production credentials to disk (already gitignored via `.env*.local`) and creates a **real** `shared_designs` document.

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `components/designer/three/decalTransform.ts` | Pure math: `DesignTransform`, `withTransform`, `clampTransform`, `DEFAULT_TRANSFORM`. No scene, no React. | **Create** |
| `components/designer/three/DecalDragController.tsx` | Rendered once inside the target mesh. **Receives** the anchor and decal-mesh refs; owns the pointer handlers, px→units conversion, live imperative preview and commit-on-release. | **Create** |
| `components/designer/three/Tshirt3DModel.tsx` | Applies `transform` to decals; hosts the controller and the decal-mesh ref; `useSheetDecalGeometry` correctness fix. | Modify |
| `components/designer/three/Preview3DStage.tsx` | `Turntable` lock + snap; plumbs `editArea` / `onCommit`. | Modify |
| `app/admin/sketches/page.tsx` | Transform state, control panel, cleanup, persistence. | Modify |
| `lib/db.ts` | `SharedDesignData` type widening. | Modify |
| `app/share/[id]/page.tsx` | Pass `transform` through to the 3D stage. | Modify |

`Tshirt3DModel.tsx` is already 903 lines. Keep new logic in the two new files; only wire-up belongs in the existing file.

---

## ⚠️ Harness facts every later task depends on

Discovered while building Task 0. Ignore any of these and the corresponding gate becomes a **silent false pass**.

| Fact | Consequence |
|---|---|
| **`SimpleLeadPopup` covers the whole viewport.** [`ConditionalFooter.tsx:96`](../../../components/layout/ConditionalFooter.tsx#L96) renders `fixed inset-0 z-[9999] bg-black/40` **4 s after load** — and the 3D model takes longer than that to appear. | Every canvas drag lands on the popup backdrop. Pointer events fire, nothing moves, the gate reports "no rotation". The driver must `addInitScript` `lead_popup_closed` / `lead_popup_shown` / `cookie_consent` **before any page script runs**, and assert the stage is the topmost element at its centre. |
| **Headless Chromium clamps `requestAnimationFrame` to exactly 30 fps**, whatever a frame actually costs. | Task 5's fps gate is otherwise both unpassable and unfalsifiable. Launch with `--disable-gpu-vsync --disable-frame-rate-limit` so rAF deltas equal real per-frame cost. |
| **Hydration race.** `setInputFiles` / `selectOption` before React hydrates mutate the DOM and are silently dropped. | Wait for `[data-testid="stage"] canvas` — the `ssr:false` dynamic import mounting is the hydration proof. |
| **`page.evaluate(fn)` breaks under `tsx`.** esbuild's `keepNames` emits a `__name(...)` helper that does not exist in the page → `ReferenceError`. | Inject evaluated code as a **string**. |
| **Port 3000 may already be serving a stale prebuilt `.next`** that returns 500 on `/dev-3d`. | The driver probes 3000-3005 and picks whichever actually serves the route. Do not `npm run build` while that server is running — it overwrites `.next` underneath it. |
| **Measured baseline (unmodified code, t-shirt + design):** rotation drag median **454 fps**, worst frame 5.2 ms; idle 500 fps. | This is the number Task 5 compares against — not the literal "≥50 fps" written there, which is a vsync-capped artefact. |
| **WebGL uses the real M1 Max GPU** via ANGLE/Metal, not SwiftShader. | Performance numbers are real, not software-rasterised. |

---

## Task 0: Verification harness ✅ DONE

Every behavioural gate in Tasks 2-6 and 8 depends on this. It must land first — Task 2 Step 6 already needs a working browser.

**Status:** complete and proven. `app/dev-3d/page.tsx` created and committed; driver at `<scratchpad>/drive.ts` exports `drag`, `recordFrameTimes`, `canvasPixels`, `pixelStats`, `meanAbsDiff`, `waitForModel`, `openHarness`, `stageBox`, `topElementAtStageCentre`. Proof run against unmodified code: model renders (opaqueRatio 0.398, 65 distinct colours), stage unobstructed, idle static (meanAbsDiff 0.000), horizontal drag rotates (meanAbsDiff 12.143). Tshirt, polo and apron paths all visually confirmed.

**One line to add when Task 4 lands:** `/dev-3d` currently passes only today's props; it needs `editArea` and `onCommit` forwarded once `Preview3DStage` accepts them.

**Files:**
- Create (temporary): `app/dev-3d/page.tsx` — **deleted in Task 8 Step 6, before the final commit**
- Create: `<scratchpad>/drive.ts` (not committed)

- [ ] **Step 1: Scratch route**

A client page at `/dev-3d` with no auth and no Firebase: product/variant picker, a file input that produces a blob URL, and `<Preview3DStage>` receiving exactly the props the admin page passes — `colorHex`, `designs`, `showGuides`, `variant`, `modelUrl`, plus the new `editArea` / `onCommit` as they appear. Mirror the `getModel3D` call from [`app/admin/sketches/page.tsx:285`](../../../app/admin/sketches/page.tsx#L285) so the variant mapping is identical.

Guard it so it can never ship: `if (process.env.NODE_ENV === 'production') return null`.

- [ ] **Step 2: Browser driver**

`<scratchpad>/drive.ts` using `playwright-core` 1.62.1 (Chromium cached in `~/Library/Caches/ms-playwright`). It must: launch, open `http://localhost:3000/dev-3d`, pick a product, set a design via the file input, and expose helpers for a synthetic pointer drag (`mouse.move`/`down`/`up` in steps) plus a frame-time recorder built on `requestAnimationFrame` deltas.

- [ ] **Step 3: Prove the harness before trusting it**

Run against the **unmodified** code and confirm the 3D model renders and horizontal drag rotates it. A harness that silently renders nothing turns every later gate into a false pass.

- [ ] **Step 4: Commit the scratch route**

```bash
git add app/dev-3d/page.tsx
git commit -m "זמני: עמוד בדיקה לתלת-ממד ללא כניסה — יימחק בסוף"
```

---

## Task 1: Transform math (pure, test-first)

**Files:**
- Create: `components/designer/three/decalTransform.ts`
- Test: scratchpad `t1-transform.test.ts` (not committed)

- [ ] **Step 1: Write the failing test**

Write it to the **repo root** as `t1-transform.test.ts`, not the scratchpad. Node resolves imports from the *file's* directory, so a scratchpad copy fails on `Cannot find package 'three'` before it ever reaches `decalTransform`. Delete the file after Step 4.

```ts
// This file lives at the REPO ROOT (see Step 1) so that both `three` and the
// module under test resolve. Run it from the repo root; delete it afterwards.
import { withTransform, clampTransform, DEFAULT_TRANSFORM } from './components/designer/three/decalTransform'

let failures = 0
const eq = (name: string, a: number, b: number, tol = 1e-9) => {
  if (Math.abs(a - b) > tol) { console.error(`FAIL ${name}: ${a} !== ${b}`); failures++ }
  else console.log(`ok   ${name}`)
}

const front = { position: [0, 0.13, 0.3] as [number,number,number], rotation: [0,0,0] as [number,number,number], size: 0.68, depth: 0.55 }
const back  = { position: [0, 0.14, -0.3] as [number,number,number], rotation: [0, Math.PI, 0] as [number,number,number], size: 0.92, depth: 0.55 }

// 1. Zero transform returns the SAME OBJECT (identity preserved — spec §4.1).
const same = withTransform(front, { dx: 0, dy: 0, scale: 1 })
if (same !== front) { console.error('FAIL identity: expected same object reference'); failures++ }
else console.log('ok   identity preserved')

// 2. undefined transform returns the same object.
if (withTransform(front, undefined) !== front) { console.error('FAIL undefined identity'); failures++ }
else console.log('ok   undefined identity')

// 3. Front area: +dx moves +x in local space.
const f = withTransform(front, { dx: 0.1, dy: 0.05, scale: 1 })
eq('front x', f.position[0], 0.1)
eq('front y', f.position[1], 0.18)
eq('front z', f.position[2], 0.3)

// 4. Back area: +dx must map to LOCAL -x, because the group's own R_y(pi)
//    flips it back to screen-right. This is the bug the whole design exists
//    to prevent (spec §4.1).
const b = withTransform(back, { dx: 0.1, dy: 0.05, scale: 1 })
eq('back x', b.position[0], -0.1)
eq('back y', b.position[1], 0.19)
eq('back z', b.position[2], -0.3)

// 5. z is never displaced by dx/dy on either area.
eq('front z unchanged', f.position[2], front.position[2])
eq('back z unchanged', b.position[2], back.position[2])

// 6. rotation, size, depth and panel survive untouched.
if (JSON.stringify(f.rotation) !== JSON.stringify(front.rotation)) { console.error('FAIL rotation'); failures++ }
eq('depth', f.depth, front.depth)

// 7. Clamp bounds.
eq('clamp dx hi', clampTransform({ dx: 9, dy: 0, scale: 1 }).dx, 0.35)
eq('clamp dx lo', clampTransform({ dx: -9, dy: 0, scale: 1 }).dx, -0.35)
eq('clamp dy hi', clampTransform({ dx: 0, dy: 9, scale: 1 }).dy, 0.35)
eq('clamp scale hi', clampTransform({ dx: 0, dy: 0, scale: 9 }).scale, 2.0)
eq('clamp scale lo', clampTransform({ dx: 0, dy: 0, scale: 0.01 }).scale, 0.3)
eq('clamp passthrough', clampTransform({ dx: 0.1, dy: -0.2, scale: 1.5 }).dy, -0.2)

// 8. DEFAULT_TRANSFORM is the no-op.
eq('default scale', DEFAULT_TRANSFORM.scale, 1)
eq('default dx', DEFAULT_TRANSFORM.dx, 0)

// 9. Every rotation in VARIANTS is I or R_y(pi) — the invariant §4.1.1 depends on.
//    Verified here against the real source, not assumed.
//    NOTE: `rotation: [...]` also matches TYPE ANNOTATIONS (`[number, number,
//    number]` at Tshirt3DModel.tsx:17 and :22). Filter those out or this
//    assertion fails against the untouched source and halts the task on a
//    false alarm.
const src = require('fs').readFileSync('components/designer/three/Tshirt3DModel.tsx', 'utf8')
const rots = [...src.matchAll(/rotation:\s*\[([^\]]+)\]/g)]
  .map(m => m[1].replace(/\s/g, ''))
  .filter(r => !r.includes('number'))          // ← drop type annotations
const allowed = new Set(['0,0,0', '0,Math.PI,0'])
const bad = rots.filter(r => !allowed.has(r))
if (bad.length) { console.error(`FAIL rotation invariant, found: ${[...new Set(bad)].join(' | ')}`); failures++ }
else console.log(`ok   rotation invariant (${rots.length} placements, all I or R_y(pi))`)

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS')
process.exit(failures ? 1 : 0)
```

- [ ] **Step 2: Run it to verify it fails**

Run from the **repo root** (`npx` fetches `tsx` on first use — it is not a dependency):

```bash
cd /Users/mac/Desktop/badfos_site && npx tsx t1-transform.test.ts
```

Expected: FAIL — cannot resolve `./components/designer/three/decalTransform`.

- [ ] **Step 3: Write the implementation**

Create `components/designer/three/decalTransform.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx <scratchpad>/t1-transform.test.ts`
Expected: `ALL PASS`, exit 0. In particular `ok   rotation invariant (N placements, all I or R_y(pi))` — if that one fails, **stop**: spec §4.1.1 no longer holds and §5.4's preview would shear.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
rm t1-transform.test.ts          # scratch assertion script — never committed
git add components/designer/three/decalTransform.ts
git commit -m "סקיצות: מודול מתמטיקה להזזה ושינוי גודל של אזור הדפסה"
```

---

## Task 2: Apply the transform in the 3D model (static)

No UI yet. After this task a hardcoded transform visibly moves and resizes the artwork.

**Files:**
- Modify: `components/designer/three/Tshirt3DModel.tsx`

- [ ] **Step 1: Widen `ShirtDesign`**

At `Tshirt3DModel.tsx:676-679`:

```ts
import { DesignTransform, withTransform } from './decalTransform';

export interface ShirtDesign {
  area: string;
  url: string;
  transform?: DesignTransform;
}
```

- [ ] **Step 2: Apply `scale` in `artworkScale` — BOTH return paths**

Replace `artworkScale` (`Tshirt3DModel.tsx:403-417`). The caps use the fallback path (`CAP_AREAS.front_full` has no `GuideBox`); missing it there is a silent half-fix.

```ts
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
  const s = placement.size * scale;
  const sx = aspect >= 1 ? s : s * aspect;
  const sy = aspect >= 1 ? s / aspect : s;
  return [sx, sy, placement.depth];
}
```

- [ ] **Step 3: Fix `useSheetDecalGeometry` — memoize on numbers, and dispose**

Two independent bugs (spec §4.3). The `placement` object identity changes every render once `dx/dy ≠ 0`, so the memo misses on unrelated re-renders; and unlike drei's `<Decal>`, nothing ever disposes the previous geometry.

In `useSheetDecalGeometry` (`Tshirt3DModel.tsx:437-478`), replace the dependency array and add disposal:

```ts
  }, [
    target,
    placement.position[0], placement.position[1], placement.position[2],
    placement.rotation[0], placement.rotation[1], placement.rotation[2],
    placement.depth, w, h,
  ]);
```

Dispose **inside the hook**, not in the consumers — it has two callers today (`SheetShirtDecal`, `SheetGuideDecal`) and a third added later would silently leak again, which is the exact bug this step exists to fix:

```ts
function useSheetDecalGeometry(...) {
  const geo = useMemo(..., [/* the numbers above */]);
  useEffect(() => () => { geo?.dispose(); }, [geo]);
  return geo;
}
```

> `next.config.js` sets `reactStrictMode: true`, so in **dev** React runs mount → cleanup → mount and disposes the live geometry once on mount. three re-registers it in `WebGLGeometries` and re-uploads on the next draw, so it self-heals. **Do not chase this, and do not "fix" it with a guard** — a guard would break the real cleanup.

- [ ] **Step 4: Thread the transform through the decal components**

`ShirtDecal` and `SheetShirtDecal` take `transform?: DesignTransform`, compute the effective placement once, and use it for both position and size:

```ts
function ShirtDecal({ url, placement, box, transform }: {
  url: string; placement: Placement; box?: GuideBox; transform?: DesignTransform;
}) {
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
```

Mirror the same two lines in `SheetShirtDecal`, passing `eff` into `useSheetDecalGeometry`.

- [ ] **Step 5: Pass it at the call site**

In the `designs.map` block (`Tshirt3DModel.tsx:850-856`), forward `transform={d.transform}` to both branches.

- [ ] **Step 6: Verify statically, then visually**

```bash
npx tsc --noEmit && npm run build
```

Then temporarily hardcode `transform={{ dx: 0.2, dy: -0.1, scale: 1.5 }}` in the `designs.map` call, run `npm run dev`, upload a file on `/admin/sketches`, and confirm the artwork moves right-and-down and grows. **Revert the hardcode before committing.**

- [ ] **Step 7: Commit**

```bash
git add components/designer/three/Tshirt3DModel.tsx
git commit -m "סקיצות: הדקאל מכבד DesignTransform + תיקון memo/dispose בסינר"
```

---

## Task 3: Edit-area plumbing and the measurement anchor

**Files:**
- Modify: `components/designer/three/Tshirt3DModel.tsx`

- [ ] **Step 1: Add the `editArea` prop**

Add `editArea?: string` to `Tshirt3DModelProps`. **Do not reuse `activeArea`** — it drives guide highlighting and the `singleArea` guide filter at `Tshirt3DModel.tsx:864-870`, which is load-bearing for the caps. The sketch page does not pass `activeArea` today and must keep not passing it.

- [ ] **Step 2: Render the anchor inside the target mesh**

When `editArea` is set and its placement exists, render inside `targetFor(editArea)`:

Declare the ref in `Tshirt3DModel`: `const anchorRef = useRef<THREE.Object3D>(null)`.

```tsx
{editArea && cfg.areas[editArea] && targetFor(editArea) === mesh && (
  <object3D ref={anchorRef} position={cfg.areas[editArea].position} />
)}
```

**Use the BASE placement — no transform.** The anchor feeds only `getWorldPosition()` → distance-to-camera and `getWorldScale()`. World scale is independent of local position, and `Bounds` puts the camera ~5.21 world units away, so a full ±0.35 lateral offset changes the euclidean distance by `√(5.21² + 0.35²) − 5.21 = 0.012` — **0.2%**. The base placement is simpler, needs no lookup helper, and keeps drag gain constant across a session instead of drifting as offsets accumulate.

The anchor lives in `Tshirt3DModel`, not the controller — only this component can resolve `targetFor(editArea)`. The controller *receives* the ref.

This anchor is the **only** correct source of world position and scale. Do not call `getWorldScale()` on the `meshes` clones: they are never added to the R3F scene and the component flattens the glTF hierarchy, so the clone reports **38.075** on the polo where the rendered value is 1.0.

- [ ] **Step 3: Show the guide for the area being edited**

The guide filter is `!uploaded.has(a)` (`Tshirt3DModel.tsx:861`), so today the area you are editing is the one area with no frame. Extend the filter so `a === editArea` is always drawn, **untransformed**, as the printable-area reference.

**Both clauses need relaxing, not just the first.** The full chain is:

```ts
!uploaded.has(a) && cfg.areas[a] && targetFor(a) === mesh && (!singleArea || a === activeArea)
```

Relaxing only `!uploaded.has(a)` leaves `(!singleArea || a === activeArea)` — and the sketch page deliberately never passes `activeArea`, so on **cap and meshcap** the edited area still gets no guide. It must become `(!singleArea || a === activeArea || a === editArea)`.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run build
```

Log `anchorRef.current.getWorldScale(new THREE.Vector3()).y` once after mount for tshirt **and polo**. Expected ≈ **1.0** for both (`normScale × mesh.scale ≈ 1` — spec §5.3). A polo reading near 38 means the wrong object was measured. Remove the log before committing.

- [ ] **Step 5: Commit**

```bash
git add components/designer/three/Tshirt3DModel.tsx
git commit -m "סקיצות: prop editArea, עוגן מדידה ומדריך לאזור הנערך"
```

---

## Task 4: Turntable lock and snap

**Files:**
- Modify: `components/designer/three/Preview3DStage.tsx`

- [ ] **Step 1: Add `locked` — via a ref, and only via a ref**

`Turntable` gains `locked?: boolean`. Store it in a ref updated by its own effect, and read `lockedRef.current` inside `down`/`move`.

**Do not add `locked` to the pointer effect's dependency array.** That effect's first statement is `el.style.touchAction = 'pan-y'` (line 59). Re-running it on every lock toggle clobbers the `touch-action: none` that edit mode just set — on mobile, entering edit mode would silently keep page-scroll behaviour, which is the exact failure this task exists to prevent.

```ts
const lockedRef = useRef(false);
useEffect(() => { lockedRef.current = !!locked; }, [locked]);
// inside move():  if (lockedRef.current) return;
```

- [ ] **Step 2: Move `touch-action` into its own effect — and REMOVE the old assignment**

```ts
useEffect(() => {
  gl.domElement.style.touchAction = locked ? 'none' : 'pan-y';
}, [gl, locked]);
```

**Delete `el.style.touchAction = 'pan-y'` from the existing pointer effect** ([`Preview3DStage.tsx:59`](../../../components/designer/three/Preview3DStage.tsx#L59)). Leaving it in place means two effects write the same property; on mount they run in declaration order and whichever is second wins — a coin flip, not a fix.

Also gate `down` with `lockedRef.current`, not just `move`, or the cursor still flips to `grabbing` in edit mode.

- [ ] **Step 3: Snap on entering edit mode — set BOTH values**

`useFrame` is `g.rotation.y += (target.current - g.rotation.y) * 0.15`. Assigning `group.rotation.y` alone is undone on the next frame. Set `target.current` too, using the same short-way normalisation as lines 50-54, and drive it from **entering edit mode**, not from `focusArea` changing — re-entering edit on the same area leaves `focusArea` unchanged while the user may have spun the model 90°.

- [ ] **Step 4: Plumb the whole chain through the stage**

`Preview3DStage` gains **both** new props and forwards them:

```ts
editArea?: string;
onCommit?: (area: string, t: DesignTransform) => void;
```

- `Turntable` gets `focusArea={editArea ?? activeArea}` and `locked={!!editArea}`.
- `Tshirt3DModel` gets `editArea` **and** `onCommit` — the drag controller is hosted there, so the callback must travel page → `Preview3DStage` → `Tshirt3DModel` → controller.

`transform` needs no new prop: it rides inside each `ShirtDesign` entry (Task 2 Step 1).

This is spec §7's data flow. Without it, Task 6 ends with a panel that mutates state which never reaches the renderer.

- [ ] **Step 5: Verify in the browser**

`npm run dev`, then on `/admin/sketches`: horizontal drag rotates; with an area selected it must not; after deselecting it must rotate again. On a touch-emulated viewport, vertical drag scrolls the page normally outside edit mode.

- [ ] **Step 6: Commit**

```bash
git add components/designer/three/Preview3DStage.tsx
git commit -m "סקיצות: נעילת סיבוב וסנאפ בכניסה למצב עריכה"
```

---

## Task 5: The drag controller — live preview, one reprojection on release

This is the task that decides whether the feature is usable. Read spec §5.4 in full first.

**Files:**
- Create: `components/designer/three/DecalDragController.tsx`
- Modify: `components/designer/three/Tshirt3DModel.tsx` (host the controller, own the decal-mesh ref)

- [ ] **Step 1: Solve admin auth for the browser driver**

Read `hooks/useAuth.ts` and `app/admin/login/page.tsx`. Write `<scratchpad>/drive.ts` using `playwright-core` (launch the cached Chromium) that logs into `/admin`, navigates to `/admin/sketches`, uploads a fixture image, and leaves the page open for scripted interaction. Everything below depends on this working.

- [ ] **Step 2: Expose the decal mesh ref**

`ShirtDecal` and `SheetShirtDecal` accept `dragRef?: React.MutableRefObject<THREE.Mesh | null>` and attach it to the rendered mesh. `Tshirt3DModel` creates the ref and passes it only for `editArea`.

Both components return `null` while the texture loads (and `SheetShirtDecal` also when the geometry is empty), so **every consumer must tolerate `ref.current == null`.**

- [ ] **Step 3: Reset the preview on commit — inside `ShirtDecal`**

⚠️ This `useLayoutEffect` must sit **above** `if (!texture) return null` ([`Tshirt3DModel.tsx:425`](../../../components/designer/three/Tshirt3DModel.tsx#L425)). Below the early return it is a conditional hook and React throws the instant a texture resolves.

```ts
// The committed offset is now baked into the geometry; leaving the preview
// transform on the mesh would double-apply it. `<Decal>` is this component's
// CHILD, so React runs its rebuild layout-effect first — the reset lands after.
// Putting this in a sibling (e.g. the controller) gives no ordering guarantee
// and produces a one-frame flicker.
useLayoutEffect(() => {
  const m = dragRef?.current;
  if (!m) return;
  m.position.set(0, 0, 0);
  m.scale.set(1, 1, 1);
}, [dragRef, eff.position[0], eff.position[1], eff.position[2], transform?.scale]);
```

**Mirror this in `SheetShirtDecal` (apron) too.** It is the other component holding a `dragRef`, and without the reset the apron double-jumps on release exactly like the drei path. The ordering rationale differs — its geometry comes from a hook in the same component, so a `useLayoutEffect` on the committed numbers is sufficient; no parent/child ordering is involved.

- [ ] **Step 4: Write the controller**

`DecalDragController` renders nothing visible. It receives the anchor ref, the decal-mesh ref, the baked placement, the committed transform, and `onCommit`.

```tsx
const { camera, size, gl } = useThree();

// px -> local model units. Bounds moves the CAMERA (it never scales the
// object) and, without `observe`, fits exactly once per mount — so this is
// read live at pointerdown rather than memoised.
const unitsPerPx = () => {
  if (!(camera instanceof THREE.PerspectiveCamera)) return 0;   // RootState.camera is
  const anchor = anchorRef.current;                             // Ortho | Perspective;
  if (!anchor) return 0;                                        // `.fov` needs narrowing
  const world = anchor.getWorldPosition(new THREE.Vector3());   // or tsc fails
  const dist = camera.position.distanceTo(world);
  const visibleH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist;
  const s = anchor.getWorldScale(new THREE.Vector3()).y || 1;   // ≈ 1 for all variants
  return (visibleH / size.height) / s;                          // size.height is CSS px,
};                                                              // matching clientX/Y
```

**`unitsPerPx` must not close over stale state.** Registered in a `[gl]`-dep effect, `camera` and `size` are captured at render 1, and `size` changes on resize. Use `const get = useThree((s) => s.get)` and call `get()` inside the handler for live values.

On `pointerdown`: snapshot `committed`, snapshot the start pointer position, and read `unitsPerPx()` **once** (the anchor sits at the base placement so it does not move mid-drag; once also keeps the gain constant). The anchor's `matrixWorld` is only valid after a rendered frame — do not read it in the effect that creates the anchor. **If it returns 0, abort the drag** rather than running one that silently does nothing.

On `pointermove`: **`mx`/`my` are the TOTAL delta since `pointerdown`, not the per-move increment.**

> `Turntable` in the same file uses the *incremental* pattern (`const dx = e.clientX - lastX; lastX = e.clientX;`, lines 71-72). Copying it here breaks everything: `c.dx + mx * upp` only holds when `c` is the pointerdown snapshot and `mx` is cumulative. Total deltas are also what makes the clamp behave — clamp a total and dragging back off the rail responds instantly; accumulate clamped increments and the design stays stuck until you have undone all the over-travel.

**Clamp the live values as they accumulate**, before computing `D`. Clamping only at commit makes the artwork follow the pointer past the limit and snap back on release.

```ts
live = clampTransform({ dx: c.dx + mx * upp, dy: c.dy - my * upp, scale: c.scale });

const sRel = live.scale / committed.scale;              // RELATIVE — the committed
const D = new THREE.Vector3(                            // scale is already baked in
  live.dx - committed.dx,                               // RELATIVE — P already holds
  live.dy - committed.dy,                               // the committed offset
  0,
).applyEuler(new THREE.Euler(...baked.rotation));       // REQUIRED — without it,
                                                        // dragging right on `back`
mesh.scale.set(sRel, sRel, 1);                          // moves the design LEFT
mesh.position.set(
  P[0] * (1 - sRel) + D.x,
  P[1] * (1 - sRel) + D.y,
  D.z,
);
```

Three traps, each of which passes a first casual test:

1. **Never `setScalar`.** `diag(s,s,s)` also displaces along the projector's z. On the t-shirt `front_full` a flank vertex reaches `z = −0.058` at only `s = 1.3` — inside the fabric — and with `depthTest` on and `polygonOffsetFactor={-6}`, it is simply occluded. Parts of the artwork visibly evaporate as the slider moves.
2. **`sRel` and `D` are relative to the baked state**, not absolute. Invisible on a fresh area; on the second adjustment an absolute scale renders `1.4 × 1.5 = 2.1` and an absolute offset jumps by the committed amount the instant you touch it.
3. **`D` must be rotated by the projector's euler.** This is the `back`-area bug the whole design exists to prevent, reintroduced through the preview path.

On `pointerup`: `onCommit(area, live)` → React state → `<Decal>` reprojects once.

**Listener placement:** `pointerdown` on `gl.domElement`; `pointermove`, `pointerup` **and `pointercancel`** on **`window`**, removed in the effect's cleanup. [`Turntable`](../../../components/designer/three/Preview3DStage.tsx#L79-L88) already models this. It matters more here than for rotation: ±0.35 ≈ ±70 px, so the pointer routinely outruns the design and leaves the canvas.

Do **not** call `setPointerCapture` on `gl.domElement` — R3F installs its own pointer handling there.

**`pointercancel` is mandatory, not defensive.** If a drag is interrupted — a system gesture on touch, tab focus loss, a browser-cancelled pointer — no `pointerup` fires, so no commit happens and the imperative transform **stays on the mesh indefinitely**. The preview then shows one thing while React state (and Firestore) hold another. On cancel, either commit `live` or reset the mesh to identity. `Turntable` handles this at [`Preview3DStage.tsx:82`](../../../components/designer/three/Preview3DStage.tsx#L82).

**Mount the controller exactly once.** Placed inside `meshes.map` without a `targetFor(editArea) === mesh` guard, the polo instantiates **40** controllers, each registering its own window handlers.

**One source of truth for `P`.** `ShirtDecal` computes `eff`; the controller needs the same `position` and `rotation`. Have `Tshirt3DModel` compute `eff` once for `editArea` and hand the same object to both — otherwise a commit landing between the two computations gives the preview a wrong origin.

- [ ] **Step 5: Verify — performance is a blocking gate**

Drive the browser, drag across the preview on a **t-shirt** (340,513-triangle decal target, the worst case by 2.5×), and measure frame times via `requestAnimationFrame` deltas injected into the page.

- Expected: sustained **≥ 50 fps** during the drag, and exactly **one** long frame on release.
- A drag that sits near 4 fps means the imperative path is not engaging and the code is falling through to a per-move reprojection.

- [ ] **Step 5a: Slider to 2.0 — nothing vanishes**

Spec §9.3א. Raise the size slider to `2.0` on a t-shirt `front_full` and confirm **no part of the artwork disappears into the fabric**. This is the `setScalar` symptom (trap 1); it first shows around `s = 1.3`, so a test that only nudges the slider will miss it.

- [ ] **Step 5b: Second adjustment — no jump, no compounding**

Spec §9.3ב. Adjust an area, release, then adjust it again. The design must not jump on the second `pointerdown`, and the size must not compound (`1.4 × 1.5 = 2.1`). This is trap 2, and it is **invisible on a fresh area** — it only appears on the second pass.

- [ ] **Step 5c: Back-area direction**

Drag right on the **`back`** area — the design moves right on screen, both during the drag and after release. This is trap 3.

- [ ] **Step 6: Commit**

```bash
git add components/designer/three/DecalDragController.tsx components/designer/three/Tshirt3DModel.tsx
git commit -m "סקיצות: גרירת העיצוב על הבגד עם תצוגה חיה והטלה אחת בשחרור"
```

---

## Task 6: The admin control panel

**Files:**
- Modify: `app/admin/sketches/page.tsx`

- [ ] **Step 1: Transform state**

```ts
const [transforms, setTransforms] = useState<Record<string, DesignTransform>>({})
const [editArea, setEditArea] = useState<string | null>(null)
```

**Hand `transforms[area]` down directly — never an inline `transforms[area] ?? { dx:0, dy:0, scale:1 }`.** A fresh object literal each render busts the `eff` memo in `ShirtDecal` and destroys the identity-preservation property Task 1 asserts. Use the module-level `DEFAULT_TRANSFORM`, or leave it `undefined`.

- [ ] **Step 1b: Wire the state into the renderer — the step that is easy to skip**

Two concrete edits in `app/admin/sketches/page.tsx`:

```ts
// :286 — carry the transform into each ShirtDesign entry
const previewDesigns = Object.entries(previews).map(([area, url]) => ({ area, url, transform: transforms[area] }))
```

```tsx
// :297 — the <Preview3DStage> element
<Preview3DStage
  warmAll noHint showGuides
  colorHex={colorHex}
  designs={previewDesigns}
  editArea={editArea ?? undefined}
  onCommit={(area, t) => { setTransforms(prev => ({ ...prev, [area]: t })); setShareUrl(null) }}
  variant={m3d.variant as any}
  modelUrl={m3d.url}
/>
```

`setShareUrl(null)` matches every other mutation on this page — an adjustment made after a sketch was created must invalidate the stale link.

- [ ] **Step 2: Panel under the preview**

Inside the preview card, below `previewEl`, so it stays adjacent on mobile (the grid is `grid-cols-1 lg:grid-cols-2`; the form comes first, the preview below).

Area chips for uploaded areas only (`Object.keys(files)`). Selecting one sets `editArea`; tapping it again clears it. Then: 4 nudge arrows (step `0.01`), a size slider (`0.3`–`2.0`, step `0.05`), and a reset button.

**Arrows map to screen direction, not logical direction** — the page is `dir="rtl"`, so a right-pointing arrow must produce `+dx`.

- [ ] **Step 3: Slider commit — not `onChange`**

> React maps `onChange` on `<input type="range">` onto the native **`input`** event, so it fires on every step of the drag — a 248 ms reprojection per 0.05 increment on the t-shirt, i.e. exactly the storm Task 5 exists to prevent, reintroduced by a literal reading of "commit on change".

`onChange`/`onInput` update the live ref only. Commit on **`onPointerUp` and `onKeyUp`** — keyboard arrows move a focused range input with no pointer event at all.

- [ ] **Step 4: State cleanup — every path that drops a file drops its transform**

| Trigger | Action |
|---|---|
| `selectProduct` | clear all + `setEditArea(null)` |
| `selectType` | drop areas removed by `areaFilter` |
| X button on an area | delete that area's transform |
| `resetAll` ("סקיצה חדשה") | **clear all** — without this the adjustment leaks into the next sketch on the same `areaId` |
| Re-uploading to an area | **keep** the transform — usually a corrected version of the same artwork; "אפס" is always available |
| Remove-background / undo | keep — same artwork |

- [ ] **Step 5: Expect the clamp to bite, and do not "fix" it**

`Bounds` fits the 2-unit model to roughly the canvas width, so 1 local unit ≈ 200 px and `±0.35` ≈ **±70 px** of finger travel on a ~400 px preview. The design stopping under the pointer after a short drag is the safety rail working.

- [ ] **Step 6: Verify**

`npx tsc --noEmit && npm run build`, then drive the browser: upload → select area → drag → arrows step → slider resizes without stretching → reset restores → "סקיצה חדשה" clears the transform.

- [ ] **Step 7: Commit**

```bash
git add app/admin/sketches/page.tsx
git commit -m "סקיצות: פאנל סידור העיצוב — גרירה, חצים, גודל ואיפוס"
```

---

## Task 7: Persistence and the share page

**Files:**
- Modify: `lib/db.ts`, `app/admin/sketches/page.tsx`, `app/share/[id]/page.tsx`

- [ ] **Step 1: Widen the type**

In `SharedDesignData`, `designs[]` gains `transform?: DesignTransform`. Optional: existing documents have no field and keep rendering exactly as before — no migration.

- [ ] **Step 2: Write it only when non-default — a hard requirement**

`lib/firebase.ts` uses plain `getFirestore` with no `ignoreUndefinedProperties`, so an explicit `transform: undefined` inside the `designs` array makes `addDoc` **throw**.

```ts
const t = transforms[area]
designs.push({ area, areaName, imageBase64: url, ...(isDefaultTransform(t) ? {} : { transform: t }) })
```

- [ ] **Step 3: Pass it through on the share page**

`app/share/[id]/page.tsx:154`:

```ts
designs={design.designs.map(d => ({ area: d.area, url: d.imageBase64, transform: d.transform }))}
```

- [ ] **Step 4: Get Firebase credentials — the only task that needs them**

```bash
cp .env.local .env.local.backup-$(date +%s)     # holds WEBHOOK_SECRET, TELEGRAM_*, GROW_WEBHOOK_KEY
vercel env pull .env.local
diff <(grep -o '^[A-Z_]*' .env.local.backup-* | sort -u) <(grep -o '^[A-Z_]*' .env.local | sort -u)
```

The `diff` is not optional — confirm the pull did not drop a local-only key. `.env*.local` is gitignored, so nothing is committed, but production credentials are now on disk.

- [ ] **Step 5: Verify end to end**

Now `/admin/sketches` is reachable for real (Google sign-in as `badfos2002@gmail.com` — the owner must complete the popup once).

Create a sketch with a clearly off-centre, resized design → open the share URL → the position and size match the admin preview exactly. Then create one **without** any adjustment and confirm the document has no `transform` key and renders as before.

This writes **real** `shared_designs` documents. Note their IDs so the owner can remove them.

- [ ] **Step 6: Commit**

```bash
git add lib/db.ts app/admin/sketches/page.tsx "app/share/[id]/page.tsx"
git commit -m "סקיצות: שמירת הכוונון ושידורו ללקוח בקישור השיתוף"
```

---

## Task 8: Regression sweep

**Files:** none — verification only.

- [ ] **Step 1: Untouched surfaces**

`/designer/tshirt` and at least two other customer designers render and behave exactly as before. The customer designers must not gain drag behaviour.

- [ ] **Step 2: Old sketches**

A `shared_designs` document without `transform` renders identically to pre-change.

- [ ] **Step 3: The two special render paths**

- **Apron** (`singleSheet`): drag works. This is the only ref that is not drei's — it is a hand-rolled `<mesh geometry={geo}>` that works because the `Apron_man` glTF node has no TRS at all. Also confirm no geometry leak during a long drag (Task 2 Step 3).
- **Polo** (`panels`): front artwork stays on the front panel and back artwork on the back after being dragged.

- [ ] **Step 4: Caps**

Cap and mesh-cap guides behave exactly as before — `activeArea` was deliberately left untouched because the `singleArea` filter depends on it.

- [ ] **Step 5: Mobile**

Touch-emulated viewport: vertical drag inside edit mode moves the design and does **not** scroll the page; after exiting, vertical drag scrolls again and horizontal drag rotates.

- [ ] **Step 6: Delete the scratch route**

```bash
git rm -r app/dev-3d
```

Task 0's harness has served its purpose. It must not ship.

- [ ] **Step 7: Final gates**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "סקיצות: הסרת עמוד הבדיקה הזמני + תיקוני רגרסיה"
```
