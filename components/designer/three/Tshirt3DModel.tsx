'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Decal, Center } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';

/* ------------------------------------------------------------------ *
 * TUNABLE CONSTANTS — adjust after seeing the model on the page.
 * ------------------------------------------------------------------ */

// Whole-model transform. The GLB has flat nodes; we render each mesh with its
// own local transform and wrap everything in <Center> to auto-center the
// bounding box at the origin, so the shirt spins ON ITS AXIS.
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
// x ∈ [-0.8,0.8] (width), y ∈ [-1,1] (height, +y=up/shoulders), z ∈ [-0.4,0.4]
// (+z = front / camera side). `size` is the MAX extent of the artwork on the
// fabric — the actual width/height are derived from the image aspect ratio so
// the print is NEVER stretched. `depth` is the projector depth (straddles the
// curved surface). Each decal is a child of the body mesh → welded to the cloth.
type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  depth: number;
};

const AREA_DECALS: Record<string, Placement> = {
  front_full: { position: [0, 0.28, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  back: { position: [0, 0.28, -0.3], rotation: [0, Math.PI, 0], size: 0.62, depth: 0.55 },
  chest_logo: { position: [-0.22, 0.46, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  chest_logo_right: { position: [0.22, 0.46, 0.28], rotation: [0, 0, 0], size: 0.16, depth: 0.45 },
  center: { position: [0, 0.28, 0.3], rotation: [0, 0, 0], size: 0.62, depth: 0.55 },
  center_wide: { position: [0, 0.28, 0.3], rotation: [0, 0, 0], size: 0.72, depth: 0.55 },
};

/* ------------------------------------------------------------------ */

/**
 * One artwork decal welded to the shirt body. The decal box is sized to the
 * image's aspect ratio (max extent = placement.size) so the print keeps its
 * proportions instead of being stretched to fill the zone. Isolated so the
 * texture-loading hook is always called unconditionally.
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
    <Decal position={placement.position} rotation={placement.rotation} scale={scale}>
      <meshStandardMaterial
        map={texture}
        transparent
        polygonOffset
        polygonOffsetFactor={-4}
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
}

export default function Tshirt3DModel({ color, designs }: Tshirt3DModelProps) {
  const { scene } = useGLTF('/models/tshirt-web.glb');

  // Pure black (#000000) on matte fabric collapses into a flat silhouette. Lift
  // ONLY near-black colors to a very dark charcoal so the folds stay visible;
  // every other color passes through untouched.
  const shirtColor = useMemo(() => {
    const c = new THREE.Color(color);
    if (Math.max(c.r, c.g, c.b) < 0.12) c.setRGB(0.09, 0.093, 0.1);
    return c;
  }, [color]);

  // Clone the scene and collect every mesh, sorted by vertex count desc.
  // The largest mesh is the shirt body (it receives the decals).
  const meshes = useMemo(() => {
    const cloned = scene.clone(true);
    const collected: THREE.Mesh[] = [];
    cloned.traverse((obj) => {
      // Keep the model's original normals — they carry the realistic fabric
      // texture. (Recomputing them flattened the shirt and lost the texture.)
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
                roughness={0.85}
                metalness={0.05}
                side={THREE.DoubleSide}
              />
              {isBody
                ? designs.map((d) => {
                    const placement = AREA_DECALS[d.area];
                    if (!placement || !d.url) return null;
                    return <ShirtDecal key={d.area} url={d.url} placement={placement} />;
                  })
                : null}
            </mesh>
          );
        })}
      </Center>
    </group>
  );
}

useGLTF.preload('/models/tshirt-web.glb');
