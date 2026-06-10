"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GameCanvas } from "@/components/GameCanvas";
import { PhotorealTv } from "@/components/experiment/PhotorealTv";
import styles from "./TvExperimentScene.module.css";

export function TvExperimentScene() {
  const [gameCanvas, setGameCanvas] = useState<HTMLCanvasElement | null>(null);
  const handleSourceCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    setGameCanvas(canvas);
  }, []);

  return (
    <main className={styles.shell}>
      <Canvas
        className={styles.canvas}
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          depth: true,
          stencil: false,
          powerPreference: "high-performance"
        }}
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          scene.background = new THREE.Color("#070605");
        }}
      >
        <Suspense fallback={<LoadingStandIn />}>
          <TvRoom sourceCanvas={gameCanvas} />
        </Suspense>
      </Canvas>

      <section className={styles.overlay} aria-label="Photoreal TV experiment notes">
        <p className={styles.eyebrow}>Experiment / TV Room</p>
        <h1>Tweet Hunt on a 2003 CRT</h1>
        <p>Isolated Three.js route. Original game route stays untouched at `/`.</p>
      </section>

      <HiddenGameFeed onSourceCanvasReady={handleSourceCanvasReady} />
    </main>
  );
}

function TvRoom({ sourceCanvas }: { sourceCanvas: HTMLCanvasElement | null }) {
  const screenTexture = useLiveScreenTexture(sourceCanvas);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0.45, 1.55, 4.75]} rotation={[-0.04, 0.08, 0]} fov={36} near={0.05} far={80} />
      <StudioEnvironment />
      <fog attach="fog" args={["#070605", 5.5, 10.5]} />
      <ambientLight intensity={0.075} />
      <hemisphereLight args={["#e4edff", "#140e08", 0.42]} />
      <spotLight
        position={[-3.4, 4.25, 3.2]}
        angle={0.48}
        penumbra={0.86}
        intensity={38}
        distance={8.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00018}
      />
      <pointLight position={[1.25, 1.1, 1.2]} color="#75b8ff" intensity={2.1} distance={3.6} />
      <pointLight position={[-2.1, 0.62, -1.55]} color="#f3a252" intensity={1.1} distance={3.2} />
      <RoomSet />
      <DustMotes />
      <PhotorealTv screenTexture={screenTexture} />
      <ContactShadows position={[0, 0.012, 0]} opacity={0.56} scale={7.5} blur={2.7} far={4.4} resolution={1024} color="#090604" />
      <OrbitControls
        makeDefault
        target={[0.04, 1.16, 0.62]}
        minDistance={2.8}
        maxDistance={6.2}
        minPolarAngle={Math.PI * 0.22}
        maxPolarAngle={Math.PI * 0.49}
        enablePan={false}
        dampingFactor={0.08}
        enableDamping
      />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.62} luminanceThreshold={0.42} luminanceSmoothing={0.42} mipmapBlur />
        <DepthOfField focusDistance={0.034} focalLength={0.048} bokehScale={1.9} />
        <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.035} premultiply />
        <Vignette offset={0.18} darkness={0.62} eskil={false} />
      </EffectComposer>
    </>
  );
}

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnvironment = new RoomEnvironment();
    const environment = pmrem.fromScene(roomEnvironment, 0.04).texture;
    scene.environment = environment;

    return () => {
      if (scene.environment === environment) scene.environment = null;
      environment.dispose();
      pmrem.dispose();
      roomEnvironment.clear();
    };
  }, [gl, scene]);

  return null;
}

function RoomSet() {
  const floorTexture = useProceduralTexture("floor");
  const wallTexture = useProceduralTexture("wall");
  const rugTexture = useProceduralTexture("rug");

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9, 1, 1]} />
        <meshStandardMaterial map={floorTexture} color="#8c6a48" roughness={0.82} metalness={0.02} />
      </mesh>
      <mesh position={[0, 2.1, -2.7]} receiveShadow>
        <planeGeometry args={[9, 4.2, 1, 1]} />
        <meshStandardMaterial map={wallTexture} color="#8c7c6b" roughness={0.9} />
      </mesh>
      <mesh position={[-2.34, 1.9, -1.95]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[2.1, 3.8, 1, 1]} />
        <meshStandardMaterial map={wallTexture} color="#766858" roughness={0.92} />
      </mesh>
      <mesh position={[0.02, 0.016, 0.82]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.7, 2.6, 1, 1]} />
        <meshStandardMaterial map={rugTexture} color="#5b2722" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.19, -0.58]} castShadow receiveShadow>
        <boxGeometry args={[2.92, 0.22, 0.86]} />
        <meshStandardMaterial color="#241711" roughness={0.74} metalness={0.03} />
      </mesh>
      <mesh position={[0, 0.43, -0.58]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.16, 0.7]} />
        <meshStandardMaterial color="#3d271b" roughness={0.62} metalness={0.04} />
      </mesh>
      <CableCurve />
    </group>
  );
}

function CableCurve() {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.22, -0.18),
      new THREE.Vector3(-0.76, 0.08, 0.05),
      new THREE.Vector3(-1.06, 0.035, 0.42),
      new THREE.Vector3(-0.72, 0.03, 0.88)
    ]);
    return new THREE.TubeGeometry(curve, 44, 0.018, 8, false);
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#050403" roughness={0.55} />
    </mesh>
  );
}

function DustMotes() {
  const positions = useMemo(() => {
    const values = new Float32Array(210);
    for (let i = 0; i < values.length; i += 3) {
      values[i] = (Math.random() - 0.5) * 4.8;
      values[i + 1] = 0.35 + Math.random() * 2.65;
      values[i + 2] = -1.3 + Math.random() * 3.8;
    }
    return values;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffe9c7" size={0.018} transparent opacity={0.16} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function LoadingStandIn() {
  return (
    <mesh position={[0, 1.2, 0]}>
      <boxGeometry args={[2.6, 1.8, 1.1]} />
      <meshStandardMaterial color="#17110e" roughness={0.7} metalness={0.08} />
    </mesh>
  );
}

function HiddenGameFeed({ onSourceCanvasReady }: { onSourceCanvasReady: (canvas: HTMLCanvasElement | null) => void }) {
  const handleRoundEnd = useCallback(() => undefined, []);
  const handleQuit = useCallback(() => undefined, []);

  return (
    <div className={styles.hiddenGameFeed} aria-hidden="true">
      <GameCanvas
        mode="B"
        roundNumber={1}
        initialScore={0}
        tweets={[]}
        isLiveTweetRound={false}
        onRoundEnd={handleRoundEnd}
        onQuit={handleQuit}
        presentation="source"
        onSourceCanvasReady={onSourceCanvasReady}
      />
    </div>
  );
}

function useLiveScreenTexture(sourceCanvas: HTMLCanvasElement | null) {
  const fallbackCanvas = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 720;
    return canvas;
  }, []);
  const activeCanvas = sourceCanvas ?? fallbackCanvas;

  const texture = useMemo(() => {
    const canvasTexture = new THREE.CanvasTexture(activeCanvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.generateMipmaps = false;
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.NearestFilter;
    canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
    canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
    return canvasTexture;
  }, [activeCanvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (!sourceCanvas) paintFallbackScreen(fallbackCanvas, clock.elapsedTime);
    texture.needsUpdate = true;
  });

  return texture;
}

function useProceduralTexture(kind: "floor" | "wall" | "rug") {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    if (kind === "floor") paintFloorTexture(ctx, canvas.width, canvas.height);
    if (kind === "wall") paintWallTexture(ctx, canvas.width, canvas.height);
    if (kind === "rug") paintRugTexture(ctx, canvas.width, canvas.height);

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.wrapS = THREE.RepeatWrapping;
    canvasTexture.wrapT = THREE.RepeatWrapping;
    canvasTexture.anisotropy = 12;
    canvasTexture.repeat.set(kind === "wall" ? 2.2 : 3.2, kind === "wall" ? 1.4 : 3.2);
    return canvasTexture;
  }, [kind]);

  useEffect(() => () => texture.dispose(), [texture]);

  return texture;
}

function paintFallbackScreen(canvas: HTMLCanvasElement, elapsed: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const pulse = 0.5 + Math.sin(elapsed * 2.4) * 0.5;
  const gradient = ctx.createRadialGradient(width * 0.48, height * 0.42, 24, width * 0.5, height * 0.48, width * 0.72);
  gradient.addColorStop(0, `rgba(${Math.round(55 + pulse * 45)}, ${Math.round(120 + pulse * 60)}, 180, 1)`);
  gradient.addColorStop(0.56, "#0b1d2a");
  gradient.addColorStop(1, "#020306");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "42px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("TWEET HUNT", width / 2, height * 0.45);
  ctx.font = "18px 'Press Start 2P', monospace";
  ctx.fillStyle = "rgba(255, 179, 38, 0.92)";
  ctx.fillText("WAITING FOR GAME FEED", width / 2, height * 0.55);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
}

function paintFloorTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#7b5738";
  ctx.fillRect(0, 0, width, height);
  for (let x = 0; x < width; x += 64) {
    ctx.fillStyle = x % 128 === 0 ? "rgba(255,230,180,0.08)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(x, 0, 3, height);
  }
  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.55 ? `rgba(255,230,190,${alpha})` : `rgba(20,10,4,${alpha})`;
    ctx.fillRect(x, y, 1 + Math.random() * 12, 1);
  }
}

function paintWallTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#8a7c6e";
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 5200; i += 1) {
    const shade = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.035})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const stain = ctx.createRadialGradient(width * 0.72, height * 0.28, 0, width * 0.72, height * 0.28, width * 0.5);
  stain.addColorStop(0, "rgba(73,45,25,0.2)");
  stain.addColorStop(1, "rgba(73,45,25,0)");
  ctx.fillStyle = stain;
  ctx.fillRect(0, 0, width, height);
}

function paintRugTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#4b1f1d";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(232,185,106,0.34)";
  ctx.lineWidth = 7;
  ctx.strokeRect(34, 34, width - 68, height - 68);
  ctx.lineWidth = 2;
  for (let x = 0; x < width; x += 7) {
    ctx.strokeStyle = `rgba(255,210,160,${0.018 + Math.random() * 0.035})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 14, height);
    ctx.stroke();
  }
}
