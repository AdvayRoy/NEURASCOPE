"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { NETWORKS, type NetworkId } from "@/lib/cortex/networks";
import { sampleAt } from "@/lib/cortex/simulate";
import { useLab } from "@/lib/state/store";
import { createBrainMaterial, REGION_TEX_SIZE } from "./brainMaterial";
import { loadBrain, type BrainAsset } from "./loadBrain";
import { AudienceField } from "./AudienceField";

function regionNetworkMap(regions: string[]) {
  const map: NetworkId[][] = regions.map(() => []);
  regions.forEach((r, i) => {
    const [hemi, name] = r.split(".");
    for (const n of NETWORKS) if (n.parcels.includes(name) && n.hemis.includes(hemi as "lh" | "rh")) map[i].push(n.id);
  });
  return map;
}

/** Network focus centroid (for camera focus) computed from vertex positions. */
function networkCentroids(asset: BrainAsset, map: NetworkId[][]) {
  const acc: Record<string, THREE.Vector3 & { c?: number }> = {};
  const counts: Record<string, number> = {};
  for (const p of asset.parts) {
    const pos = p.geometry.getAttribute("position");
    const reg = p.geometry.getAttribute("region");
    for (let i = 0; i < pos.count; i += 7) {
      for (const n of map[reg.getX(i)] ?? []) {
        acc[n] ??= new THREE.Vector3();
        acc[n].x += pos.getX(i); acc[n].y += pos.getY(i); acc[n].z += pos.getZ(i);
        counts[n] = (counts[n] ?? 0) + 1;
      }
    }
  }
  const out: Partial<Record<NetworkId, THREE.Vector3>> = {};
  for (const k of Object.keys(acc)) out[k as NetworkId] = acc[k].divideScalar(counts[k]);
  return out;
}

function Brain({ asset, interactive }: { asset: BrainAsset; interactive: boolean }) {
  const tex = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(REGION_TEX_SIZE * 4), REGION_TEX_SIZE, 1, THREE.RGBAFormat);
    t.needsUpdate = true;
    return t;
  }, []);
  const { material, uniforms } = useMemo(() => createBrainMaterial(tex), [tex]);
  const map = useMemo(() => regionNetworkMap(asset.regions), [asset]);
  const cur = useRef(new Float32Array(REGION_TEX_SIZE * 4));
  const [hover, setHover] = useState<number | null>(null);
  const group = useRef<THREE.Group>(null);
  const set = useLab((s) => s.set);

  useFrame((_, dt) => {
    const s = useLab.getState();
    const run = s.run;
    const data = tex.image.data as Uint8Array;
    const target = new Float32Array(REGION_TEX_SIZE * 4);
    const fr = run?.fractures.find((f) => f.id === s.fractureId);
    const cf = s.activeCf ? s.counterfactuals[s.activeCf] : null;
    const src = cf?.run ?? run;
    if (src && s.mode !== "neural") {
      const hz = src.sim.hz;
      const t = s.time;
      const att = s.cohort === null ? null : src.sim.attentionByCohort[s.cohort];
      const cohortScale = att ? sampleAt(att, hz, t) / Math.max(0.05, sampleAt(src.sim.attention, hz, t)) : 1;
      const val: Partial<Record<NetworkId, number>> = {};
      for (const n of NETWORKS) val[n.id] = Math.min(1, sampleAt(src.networks[n.id], hz, t) * cohortScale);
      const focus = new Set<NetworkId>(s.network ? [s.network] : fr ? fr.networks : []);
      for (let r = 0; r < asset.regions.length; r++) {
        const nets = map[r];
        if (!nets.length) continue;
        let v = 0;
        for (const n of nets) if (s.mode === "cortex" || !s.network || s.network === n) v = Math.max(v, val[n] ?? 0);
        if (s.mode === "networks" && s.network && !nets.includes(s.network)) v *= 0.15;
        const inFocus = nets.some((n) => focus.has(n));
        target[4 * r] = s.mode === "cortex" ? v * 0.9 : v;
        target[4 * r + 1] = focus.size ? (inFocus ? 1 : 0) : 1;
        target[4 * r + 2] = fr && inFocus && !cf ? 1 : 0;
      }
    } else if (src && s.mode === "neural") {
      // Reliability proxy is a single global scalar; it is shown uniformly, never spatialized.
      const isc = sampleAt(src.eeg.isc, src.sim.hz, s.time);
      const k = Math.min(1, Math.max(0, (isc - 0.12) / 0.23));
      for (let r = 0; r < asset.regions.length; r++) {
        if (!map[r].length) continue;
        target[4 * r] = k;
        target[4 * r + 1] = 1;
      }
    }
    if (hover !== null) target[4 * hover + 3] = 1;
    const a = 1 - Math.exp(-dt * 10);
    for (let i = 0; i < target.length; i++) {
      cur.current[i] += (target[i] - cur.current[i]) * a;
      data[i] = Math.round(Math.min(1, Math.max(0, cur.current[i])) * 255);
    }
    tex.needsUpdate = true;
    const focusing = Boolean(s.network || s.fractureId);
    uniforms.uDim.value += ((focusing ? 1 : 0) - uniforms.uDim.value) * a;
  });

  return (
    <group ref={group} rotation={[0, -Math.PI / 2, 0]}>
      {asset.parts.map((p) => (
        <mesh
          key={p.name}
          geometry={p.geometry}
          material={material}
          onPointerMove={
            interactive
              ? (e) => {
                  e.stopPropagation();
                  const face = e.face;
                  if (!face) return;
                  const r = p.geometry.getAttribute("region").getX(face.a);
                  if (r !== hover) setHover(r);
                }
              : undefined
          }
          onPointerOut={interactive ? () => setHover(null) : undefined}
          onClick={
            interactive
              ? (e) => {
                  e.stopPropagation();
                  const face = e.face;
                  if (!face) return;
                  const r = p.geometry.getAttribute("region").getX(face.a);
                  const n = map[r]?.[0] ?? null;
                  set({ network: useLab.getState().network === n ? null : n, mode: n ? "networks" : useLab.getState().mode });
                }
              : undefined
          }
        />
      ))}
      <RegionLabel asset={asset} hover={hover} map={map} />
    </group>
  );
}

function RegionLabel({ asset, hover, map }: { asset: BrainAsset; hover: number | null; map: NetworkId[][] }) {
  const setHoverLabel = useLab((s) => s.set);
  useEffect(() => {
    if (hover === null) return setHoverLabel({ hoverRegion: null });
    const name = asset.regions[hover];
    setHoverLabel({ hoverRegion: { name, networks: map[hover] } });
  }, [hover, asset, map, setHoverLabel]);
  return null;
}

function CameraRig({ centroids }: { centroids: Partial<Record<NetworkId, THREE.Vector3>> }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const desired = useRef<THREE.Vector3 | null>(null);
  const idle = useRef(0);
  const network = useLab((s) => s.network);
  const fractureId = useLab((s) => s.fractureId);
  const run = useLab((s) => s.run);

  useEffect(() => {
    const n = network ?? run?.fractures.find((f) => f.id === fractureId)?.networks[0] ?? null;
    const c = n ? centroids[n] : null;
    if (!c) { desired.current = null; target.current.set(0, 0, 0); return; }
    // Group is rotated -90° about Y: world = (z, y, -x) → rotate the centroid accordingly.
    const w = new THREE.Vector3(-c.z, c.y, c.x);
    target.current.copy(w).multiplyScalar(0.35);
    const dir = w.clone().setY(w.y * 0.6).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    desired.current = dir.multiplyScalar(4.0).add(new THREE.Vector3(0, 0.35, 0));
  }, [network, fractureId, run, centroids]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const a = 1 - Math.exp(-dt * 4);
    c.target.lerp(target.current, a);
    if (desired.current) {
      camera.position.lerp(desired.current, a * 0.9);
      if (camera.position.distanceTo(desired.current) < 0.02) desired.current = null;
    }
    idle.current += dt;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    c.autoRotate = !reduce && idle.current > 6 && !useLab.getState().playing && !useLab.getState().fractureId;
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={2.1}
      maxDistance={6}
      autoRotateSpeed={0.25}
      enableDamping
      dampingFactor={0.08}
      onStart={() => { idle.current = 0; desired.current = null; }}
    />
  );
}

export function BrainCanvas({ interactive = true, showAudience = true }: { interactive?: boolean; showAudience?: boolean }) {
  const [asset, setAsset] = useState<BrainAsset | null>(null);
  useEffect(() => {
    loadBrain().then(setAsset).catch(() => setAsset(null));
  }, []);
  const centroids = useMemo(() => (asset ? networkCentroids(asset, regionNetworkMap(asset.regions)) : {}), [asset]);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [1.15, 0.7, 4.3], fov: 32, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
    >
      <color attach="background" args={["#0b0c0e"]} />
      <hemisphereLight args={["#e9eef7", "#1a1714", 0.55]} />
      <directionalLight position={[3, 4, 3]} intensity={1.5} />
      <directionalLight position={[-4, 1, -2]} intensity={0.55} color="#c9d6ff" />
      <directionalLight position={[0, -3, 2]} intensity={0.25} />
      {asset && <Brain asset={asset} interactive={interactive} />}
      {showAudience && <AudienceField />}
      <CameraRig centroids={centroids} />
    </Canvas>
  );
}
