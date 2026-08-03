'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Decal, Center, useTexture } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';

/* ------------------------------------------------------------------ *
 * TUNABLE CONSTANTS — adjust after seeing the model on the page.
 * ------------------------------------------------------------------ */

// Whole-model transform. The GLB has 2 flat nodes (no nested groups),
// each carrying its own local translation + uniform scale which, because
// the hierarchy is flat, IS its world transform. We therefore render each
// mesh with its own position/rotation/scale (see below) and wrap everything
// in <Center> to auto-center the bounding box at the origin. This group
// then lets you nudge/scale/rotate the centered result.
const MODEL: {
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
} = {
  scale: 1,
  rotation: [0, 0, 0],
  position: [0, 0, 0],
};

// Chest decal placement, in the BODY mesh's LOCAL space (the body mesh has
// its own scale ~0.339, so these values live in that pre-scale coordinate
// space). Tune position/scale to land the artwork on the chest.
const DECAL: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
} = {
  position: [0, 0.05, 0.15],
  rotation: [0, 0, 0],
  scale: 0.25,
};

/* ------------------------------------------------------------------ */

interface ShirtDecalProps {
  decalUrl: string;
}

/**
 * Decal is isolated in its own component so the texture-loading hook is
 * always called unconditionally (this component only mounts when a decal
 * exists). It must render <Decal> directly so drei can find the parent mesh.
 */
function ShirtDecal({ decalUrl }: ShirtDecalProps) {
  const texture = useLoader(THREE.TextureLoader, decalUrl);

  useMemo(() => {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <Decal position={DECAL.position} rotation={DECAL.rotation} scale={DECAL.scale}>
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

interface Tshirt3DModelProps {
  color: string;
  decalUrl: string | null;
}

export default function Tshirt3DModel({ color, decalUrl }: Tshirt3DModelProps) {
  const { scene } = useGLTF('/models/tshirt-web.glb');

  // Fabric maps (real woven-cotton detail from the model's textures).
  // normalMap makes light play on the weave — so white/black read as real
  // fabric, and the chosen color sits on the weave like a Photoshop Multiply.
  const [normalMap, roughnessMap] = useTexture([
    '/models/tex/tshirt_normal.png',
    '/models/tex/tshirt_roughness.png',
  ]);
  useMemo(() => {
    [normalMap, roughnessMap].forEach((t) => {
      if (!t) return;
      t.flipY = false; // match the glTF UV convention
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    });
  }, [normalMap, roughnessMap]);

  // Clone the scene and collect every mesh, sorted by vertex count desc.
  // The largest mesh is the shirt body (it receives the decal).
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
    <group
      scale={MODEL.scale}
      rotation={MODEL.rotation}
      position={MODEL.position}
    >
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
                color={color}
                normalMap={normalMap}
                roughnessMap={roughnessMap}
                roughness={1}
                metalness={0}
                side={THREE.DoubleSide}
              />
              {isBody && decalUrl ? <ShirtDecal decalUrl={decalUrl} /> : null}
            </mesh>
          );
        })}
      </Center>
    </group>
  );
}

useGLTF.preload('/models/tshirt-web.glb');
