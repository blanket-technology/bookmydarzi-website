"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Procedural draped-cloth mesh - not a downloaded 3D model (no asset
 * pipeline, no GLTF fetch, stays tiny and fast to first paint). Built from a
 * displaced plane: a base fold pattern (fabric hanging under its own
 * "weight") blended with a second, animatable pattern driven by `progress`
 * (0 = relaxed drape, 1 = pinned/taut, as if being measured and pinned at
 * the tailor's hands) - this is the scroll-scrubbed "stitching stages"
 * effect for the process section, and a gentle idle version of the same
 * uniform for the hero. */
function DrapedCloth({ progress }: { progress: React.RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3.2, 4, 64, 80);
    return geo;
  }, []);

  const basePositions = useMemo(() => {
    const pos = geometry.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    arr.set(pos.array as Float32Array);
    return arr;
  }, [geometry]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    const p = progress.current ?? 0;

    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = basePositions[i * 3];
      const y = basePositions[i * 3 + 1];

      // Relaxed drape: a few overlapping sine folds running down the cloth,
      // amplitude strongest at the bottom (hanging weight), fading toward
      // the top (pinned at the hanger).
      const heightFactor = (y + 2) / 4; // 0 at bottom, 1 at top
      const drape =
        Math.sin(x * 2.2 + t * 0.15) * 0.38 * heightFactor +
        Math.sin(x * 4.5 - t * 0.1) * 0.16 * heightFactor +
        Math.sin(y * 1.8 + x * 1.1) * 0.1;

      // Taut/pinned state: folds flatten and a subtle measured-grid ripple
      // replaces them, as if pins are holding the fabric flat for fitting.
      const taut = Math.sin(x * 8 + y * 3) * 0.015;

      const z = THREE.MathUtils.lerp(drape, taut, p);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();

    // Gentle continuous rotation, independent of scroll - the piece always
    // feels alive, scroll only drives its fold state.
    mesh.rotation.y = Math.sin(t * 0.25) * 0.35 + p * 0.6;
    mesh.rotation.x = Math.cos(t * 0.2) * 0.05;

    if (materialRef.current) {
      // Warms slightly as it reaches the "finished" state - a small color
      // cue that something has changed, not just geometry.
      materialRef.current.color.setHSL(0.09, 0.25 + p * 0.1, 0.55 + p * 0.08);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        color="#8a7a5e"
        roughness={0.65}
        metalness={0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Dynamically-imported (ssr:false, see GarmentSceneLazy.tsx) Three.js
 * canvas - the scroll-progress ref is written to from outside (GSAP
 * ScrollTrigger's onUpdate) rather than passed as reactive props, so the
 * mesh deformation updates on every rAF via useFrame instead of forcing a
 * React re-render per scroll pixel. */
export default function GarmentScene({ progress }: { progress: React.RefObject<number> }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} />
      <directionalLight position={[-3, -2, -4]} intensity={0.5} color="#d2aa5c" />
      <DrapedCloth progress={progress} />
    </Canvas>
  );
}
