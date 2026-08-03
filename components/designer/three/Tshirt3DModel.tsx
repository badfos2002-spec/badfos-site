'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Decal, Center } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';

/* ------------------------------------------------------------------ *
 * TUNABLE CONSTANTS — adjust after seeing the model on the page.
 * ------------------------------------------------------------------ */

// Whole-model transform. The GLB has flat nodes (no nested groups); we render
// each mesh with its own local transform and wrap everything in <Center> to
// auto-center the bounding box at the origin, so the shirt spins ON ITS AXIS.
const MODEL: {
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
} = {
  scale: 1,
  rotation: [0, 0, 0],
  position: [0, 0, 0],
};

// Per-AREA artwork placement, in the BODY mesh's LOCAL space (the body mesh
// carries its own scale ~0.339, so these values live in that pre-scale space).
// Each decal is a CHILD of the body mesh → it is welded to the fabric and
// rotates together with the shirt. Front artwork faces +Z, back faces -Z.
// Tune position/scale per area after seeing it on the model.
type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number] | number;
};

// Values are in the body geometry's normalized local space:
// x ∈ [-0.8,0.8] (width), y ∈ [-1,1] (height, +y=up/shoulders), z ∈ [-0.4,0.4]
// (+z = front / camera side). The scale is the projector box [w,h,depth]; a
// generous depth ensures the box straddles the curved fabric surface.
const AREA_DECALS: Record<string, Placement> = {
  front_full: { position: [0, 0.28, 0.3], rotation: [0, 0, 0], scale: [0.58, 0.64, 0.55] },
  back: { position: [0, 0.28, -0.3], rotation: [0, Math.PI, 0], scale: [0.58, 0.64, 0.55] },
  chest_logo: { position: [-0.22, 0.46, 0.28], rotation: [0, 0, 0], scale: [0.16, 0.16, 0.45] },
  chest_logo_right: { position: [0.22, 0.46, 0.28], rotation: [0, 0, 0], scale: [0.16, 0.16, 0.45] },
  center: { position: [0, 0.28, 0.3], rotation: [0, 0, 0], scale: [0.58, 0.64, 0.55] },
  center_wide: { position: [0, 0.28, 0.3], rotation: [0, 0, 0], scale: [0.72, 0.52, 0.55] },
};

/* ------------------------------------------------------------------ */

/**
 * One artwork decal welded to the shirt body. Isolated so the texture-loading
 * hook is always called unconditionally. Must render <Decal> directly so drei
 * can find the parent mesh.
 */
function ShirtDecal({ url, placement }: { url: string; placement: Placement }) {
  const texture = useLoader(THREE.TextureLoader, url);

  useMemo(() => {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <Decal position={placement.position} rotation={placement.rotation} scale={placement.scale}>
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

  // Pure black (#000000) on matte fabric collapses into a flat silhouette (no
  // folds/shading). Lift ONLY near-black colors to a dark charcoal so the form
  // stays visible; every other color passes through untouched.
  const shirtColor = useMemo(() => {
    const c = new THREE.Color(color);
    if (Math.max(c.r, c.g, c.b) < 0.12) c.setRGB(0.15, 0.155, 0.165);
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
              // Flat hierarchy => the mesh's local transform is its world
              // transform, so we forward it verbatim.
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
