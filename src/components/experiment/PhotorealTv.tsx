"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const MODEL_BASE = "/models/tv/electronics-tv-2003/";
const MODEL_OBJ = `${MODEL_BASE}electronics-tv-2003.obj`;
const MODEL_MTL = `${MODEL_BASE}electronics-tv-2003.mtl`;

type Props = {
  screenTexture: THREE.Texture;
};

export function PhotorealTv({ screenTexture }: Props) {
  const materials = useLoader(MTLLoader, MODEL_MTL, (loader) => {
    loader.setResourcePath(MODEL_BASE);
  });
  const sourceObject = useLoader(OBJLoader, MODEL_OBJ, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  const tvObject = useMemo(() => {
    const clone = sourceObject.clone(true);

    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.material = Array.isArray(node.material) ? node.material.map(upgradeMaterial) : upgradeMaterial(node.material);
    });

    return clone;
  }, [sourceObject]);

  return (
    <group position={[0, 0.06, 0]} rotation={[0, -0.16, 0]} scale={1.22}>
      <primitive object={tvObject} />
      <ScreenSurface texture={screenTexture} />
    </group>
  );
}

function ScreenSurface({ texture }: { texture: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0.025, 1.414, 1.046]}>
        <planeGeometry args={[2.02, 1.52, 64, 48]} />
        <meshStandardMaterial
          map={texture}
          emissive="#b7ddff"
          emissiveMap={texture}
          emissiveIntensity={1.45}
          metalness={0}
          roughness={0.28}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.025, 1.414, 1.058]}>
        <planeGeometry args={[2.04, 1.54, 32, 24]} />
        <meshPhysicalMaterial
          color="#dfefff"
          transparent
          opacity={0.15}
          metalness={0}
          roughness={0.045}
          clearcoat={1}
          clearcoatRoughness={0.025}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-0.34, 1.72, 1.062]} rotation={[0, 0, -0.08]}>
        <planeGeometry args={[0.46, 1.36]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function upgradeMaterial(material: THREE.Material) {
  const original = material as THREE.MeshPhongMaterial & {
    map?: THREE.Texture | null;
    color?: THREE.Color;
    opacity?: number;
    transparent?: boolean;
  };
  const name = material.name ?? "";

  if (name === "NO_DRAW") {
    return new THREE.MeshStandardMaterial({
      name,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
  }

  const map = original.map ?? null;
  if (map) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 12;
  }

  const color = original.color ? original.color.clone() : new THREE.Color("#777777");
  let roughness = 0.56;
  let metalness = 0.03;
  let clearcoat = 0.15;
  let clearcoatRoughness = 0.4;

  if (name.includes("Silver") || name.includes("Chrome")) {
    metalness = name.includes("Chrome") ? 0.86 : 0.46;
    roughness = name.includes("Chrome") ? 0.2 : 0.36;
    clearcoat = 0.35;
    clearcoatRoughness = 0.18;
  }

  if (name.includes("Black_SemiGloss")) {
    roughness = 0.24;
    clearcoat = 0.8;
    clearcoatRoughness = 0.16;
  }

  if (name.includes("Black_Flat")) {
    roughness = 0.78;
    clearcoat = 0.02;
  }

  if (name.includes("Yellow_Plastic") || name.includes("White_Semi")) {
    roughness = 0.33;
    clearcoat = 0.65;
    clearcoatRoughness = 0.2;
  }

  if (name.includes("TV_Screen")) {
    color.set("#050706");
    roughness = 0.12;
    clearcoat = 1;
    clearcoatRoughness = 0.04;
  }

  return new THREE.MeshPhysicalMaterial({
    name,
    color,
    map,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    envMapIntensity: 1.25,
    transparent: Boolean(original.transparent),
    opacity: original.opacity ?? 1
  });
}
